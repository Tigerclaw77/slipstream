import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import Stripe from "stripe";
import { normalizeIntake, validateIntake } from "../src/lib/intakeValidation.js";
import type { AdminReportRequest, IntakeValues, PublicReportRequest } from "../src/productTypes.js";
import { assertProductionConfig, config } from "./config.js";
import {
  attachStripeSession,
  confirmPaymentFromStripeEvent,
  createReportRequest,
  getDatabaseHealth,
  getReportRequest,
  getReportRequestByStripeSession,
  listReportRequests,
  markReportPaid,
  resetEmailForRetry,
  resetReportForRegeneration,
  type ReportRequestRecord,
} from "./db.js";
import { enqueueReport, getQueueHealth, recoverReportQueue } from "./queue.js";
import { verifyEmailTransport } from "./email.js";

assertProductionConfig();

const app = express();
const stripe = config.stripeSecretKey ? new Stripe(config.stripeSecretKey) : null;

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(securityHeaders);
app.use("/api", rateLimit("api", 300, 60_000));
app.use("/api", (_request, response, next) => {
  response.setHeader("Cache-Control", "no-store");
  next();
});

app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), (request, response) => {
  if (!stripe || !config.stripeWebhookSecret) {
    response.status(503).json({ error: "Stripe webhook is not configured." });
    return;
  }

  const signature = request.header("stripe-signature");
  if (!signature) {
    response.status(400).json({ error: "Missing Stripe signature." });
    return;
  }

  try {
    const event = stripe.webhooks.constructEvent(request.body, signature, config.stripeWebhookSecret);
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadataId = session.metadata?.reportRequestId ?? session.client_reference_id;
      const reportRequest = getReportRequestByStripeSession(session.id) ?? (metadataId ? getReportRequest(metadataId) : undefined);
      if (reportRequest && session.payment_status === "paid" && sessionBelongsToRequest(session, reportRequest)) {
        if (!reportRequest.stripe_session_id) attachStripeSession(reportRequest.id, session.id);
        const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;
        const result = confirmPaymentFromStripeEvent(event.id, event.type, reportRequest.id, paymentIntentId);
        if (!result.duplicate) enqueueReport(reportRequest.id);
      }
    }
    response.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook.";
    response.status(400).json({ error: message });
  }
});

app.use(express.json({ limit: "32kb" }));

app.get("/api/public-config", (_request, response) => {
  response.json({
    priceCents: config.reportPriceCents,
    supportEmail: config.supportEmail,
    deliveryTimeframe: config.deliveryTimeframe,
  });
});

app.get("/api/health", async (request, response) => {
  const checks = {
    database: getDatabaseHealth(),
    storage: storageIsWritable(),
    smtpConfigured: Boolean(config.smtp.host && config.smtp.user && config.smtp.pass && config.smtp.from),
    stripeConfigured: Boolean(stripe && config.stripeWebhookSecret),
  };
  const deep = request.query.deep === "1";
  let connectivity: { smtp: boolean; stripe: boolean } | undefined;
  if (deep) {
    if (!config.adminToken || !secureEqual(config.adminToken, request.header("x-admin-token") ?? "")) {
      response.status(401).json({ error: "Admin token required for deep health checks." });
      return;
    }
    const [smtpResult, stripeResult] = await Promise.allSettled([
      verifyEmailTransport(),
      stripe ? stripe.balance.retrieve().then(() => true) : Promise.resolve(false),
    ]);
    connectivity = {
      smtp: smtpResult.status === "fulfilled" && smtpResult.value,
      stripe: stripeResult.status === "fulfilled" && stripeResult.value,
    };
  }
  const productionServicesReady = config.nodeEnv !== "production" || (checks.smtpConfigured && checks.stripeConfigured);
  const connectivityReady = !connectivity || (connectivity.smtp && connectivity.stripe);
  const ok = checks.database && checks.storage && productionServicesReady && connectivityReady;
  response.status(ok ? 200 : 503).json({
    ok,
    service: "slipstream-seo",
    time: new Date().toISOString(),
    checks,
    connectivity,
    queue: getQueueHealth(),
  });
});

app.post("/api/checkout", rateLimit("checkout", 10, 15 * 60_000), async (request, response, next) => {
  try {
    const body = request.body && typeof request.body === "object" ? request.body as Record<string, unknown> : {};
    const rawValues: IntakeValues = {
      businessName: typeof body.businessName === "string" ? body.businessName : "",
      website: typeof body.website === "string" ? body.website : "",
      address: typeof body.address === "string" ? body.address : "",
      email: typeof body.email === "string" ? body.email : "",
      notes: typeof body.notes === "string" ? body.notes : "",
    };
    const values = normalizeIntake(rawValues);
    const errors = validateIntake(values);
    if (Object.keys(errors).length > 0) {
      response.status(400).json({ error: "Review the highlighted fields.", fields: errors });
      return;
    }

    const reportRequest = createReportRequest(values);
    const confirmationUrl = `${config.appUrl}/confirmation?request=${reportRequest.id}&access=${reportRequest.public_token}`;

    if (config.devBypassPayment && config.nodeEnv !== "production") {
      const bypassSessionId = `development-bypass-${reportRequest.id}`;
      attachStripeSession(reportRequest.id, bypassSessionId);
      markReportPaid(reportRequest.id, "development-bypass");
      enqueueReport(reportRequest.id);
      response.json({ url: `${confirmationUrl}&session_id=${bypassSessionId}`, mode: "development-bypass" });
      return;
    }

    if (!stripe) {
      response.status(503).json({ error: "Checkout is temporarily unavailable. Please try again shortly." });
      return;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: values.email,
      client_reference_id: reportRequest.id,
      metadata: { reportRequestId: reportRequest.id },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: config.reportPriceCents,
          product_data: {
            name: "Slipstream Local Visibility Report",
            description: "A focused local market, competitor, visibility, and 90-day action report.",
          },
        },
      }],
      success_url: `${confirmationUrl}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.appUrl}/get-report?canceled=1`,
      submit_type: "pay",
    }, { idempotencyKey: `slipstream-checkout-${reportRequest.id}` });

    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    attachStripeSession(reportRequest.id, session.id);
    response.json({ url: session.url, mode: "stripe" });
  } catch (error) {
    next(error);
  }
});

app.post("/api/report-requests/:id/reconcile", rateLimit("reconcile", 30, 15 * 60_000), async (request, response, next) => {
  try {
    const record = authenticatedReportRequest(request);
    if (!record) {
      response.status(404).json({ error: "Report request not found." });
      return;
    }
    const sessionId = typeof request.body?.sessionId === "string" ? request.body.sessionId : "";
    if (!sessionId || !record.stripe_session_id || !secureEqual(record.stripe_session_id, sessionId)) {
      response.status(400).json({ error: "Checkout session could not be verified." });
      return;
    }

    if (sessionId.startsWith("development-bypass-") && config.nodeEnv !== "production") {
      markReportPaid(record.id, "development-bypass");
      enqueueReport(record.id);
      response.json({ reconciled: true });
      return;
    }
    if (!stripe) {
      response.status(503).json({ error: "Payment verification is temporarily unavailable." });
      return;
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!sessionBelongsToRequest(session, record)) {
      response.status(400).json({ error: "Checkout session does not match this report request." });
      return;
    }
    if (session.payment_status !== "paid") {
      response.status(409).json({ error: "Stripe has not confirmed payment yet." });
      return;
    }
    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;
    markReportPaid(record.id, paymentIntentId);
    enqueueReport(record.id);
    response.json({ reconciled: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/report-requests/:id", rateLimit("status", 120, 15 * 60_000), (request, response) => {
  const record = authenticatedReportRequest(request);
  if (!record) {
    response.status(404).json({ error: "Report request not found." });
    return;
  }
  response.json(toPublicReportRequest(record));
});

app.get("/api/reports/:id/download", rateLimit("download", 60, 15 * 60_000), (request, response) => {
  const record = getReportRequest(String(request.params.id));
  if (
    !record ||
    !record.pdf_generated_at ||
    !record.pdf_path ||
    !secureEqual(record.download_token, String(request.query.token ?? "")) ||
    !fs.existsSync(record.pdf_path)
  ) {
    response.status(404).json({ error: "Report file not found." });
    return;
  }

  const filename = `${record.business_name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "business"}-local-visibility-report.pdf`;
  response.download(record.pdf_path, filename);
});

app.get("/api/admin/reports", rateLimit("admin", 120, 15 * 60_000), requireAdmin, (_request, response) => {
  const records: AdminReportRequest[] = listReportRequests().map((record) => ({
    id: record.id,
    businessName: record.business_name,
    address: record.address,
    email: record.email,
    status: record.status,
    paymentStatus: record.payment_status,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    completedAt: record.completed_at,
    errorMessage: record.error_message,
    errorStage: record.error_stage,
    analysisCompletedAt: record.analysis_completed_at,
    pdfGeneratedAt: record.pdf_generated_at,
    emailDeliveredAt: record.email_delivered_at,
  }));
  response.json({ reports: records });
});

app.post("/api/admin/reports/:id/retry-generation", rateLimit("admin-write", 30, 15 * 60_000), requireAdmin, (request, response) => {
  const record = resetReportForRegeneration(String(request.params.id));
  if (!record || record.payment_status !== "paid") {
    response.status(404).json({ error: "Paid report request not found." });
    return;
  }
  enqueueReport(record.id);
  response.status(202).json({ ok: true, id: record.id });
});

app.post("/api/admin/reports/:id/retry-email", rateLimit("admin-write", 30, 15 * 60_000), requireAdmin, (request, response) => {
  const record = resetEmailForRetry(String(request.params.id));
  if (!record || record.payment_status !== "paid" || !record.pdf_path) {
    response.status(404).json({ error: "Completed report not found." });
    return;
  }
  enqueueReport(record.id);
  response.status(202).json({ ok: true, id: record.id });
});

if (config.nodeEnv === "production") {
  const distPath = path.resolve("dist");
  app.use(["/sales-intelligence", "/research", "/experiments", "/internal-data"], (_request, response) => {
    response.status(404).json({ error: "Not found." });
  });
  app.use(express.static(distPath, { index: false, maxAge: "1h", dotfiles: "deny" }));
  app.use((request, response, next) => {
    if (request.method !== "GET" || request.path.startsWith("/api/")) {
      next();
      return;
    }
    response.setHeader("Cache-Control", "no-cache");
    response.sendFile(path.join(distPath, "index.html"));
  });
}

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  console.error(error);
  const message = config.nodeEnv === "production"
    ? `Something went wrong. Please try again or contact ${config.supportEmail}.`
    : error instanceof Error ? error.message : "Unexpected server error.";
  response.status(500).json({ error: message });
});

app.listen(config.port, config.host, () => {
  console.info(`Slipstream SEO is running at ${config.appUrl}`);
  const recovery = recoverReportQueue();
  if (recovery.queued || recovery.recoveredStuckJobs) console.info("Fulfillment recovery", recovery);
});

function authenticatedReportRequest(request: Request) {
  const record = getReportRequest(String(request.params.id));
  return record && secureEqual(record.public_token, String(request.query.access ?? "")) ? record : null;
}

function sessionBelongsToRequest(session: Stripe.Checkout.Session, record: ReportRequestRecord) {
  const metadataId = session.metadata?.reportRequestId ?? session.client_reference_id;
  return metadataId === record.id && (!record.stripe_session_id || record.stripe_session_id === session.id);
}

function toPublicReportRequest(record: ReportRequestRecord): PublicReportRequest {
  return {
    id: record.id,
    businessName: record.business_name,
    status: record.status,
    createdAt: record.created_at,
    completedAt: record.completed_at,
    downloadUrl: record.pdf_generated_at
      ? `/api/reports/${record.id}/download?token=${record.download_token}`
      : null,
    message: publicStatusMessage(record),
    stages: {
      paymentConfirmed: Boolean(record.payment_confirmed_at),
      analysisComplete: Boolean(record.analysis_completed_at),
      pdfGenerated: Boolean(record.pdf_generated_at),
      emailDelivered: Boolean(record.email_delivered_at),
    },
  };
}

function requireAdmin(request: Request, response: Response, next: NextFunction) {
  if (!config.adminToken) {
    response.status(503).json({ error: "Admin access is not configured." });
    return;
  }
  if (!secureEqual(config.adminToken, request.header("x-admin-token") ?? "")) {
    response.status(401).json({ error: "Invalid admin access token." });
    return;
  }
  next();
}

function secureEqual(expected: string, actual: string) {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

function publicStatusMessage(record: ReportRequestRecord) {
  if (record.pdf_generated_at && record.email_delivered_at) return "Your report is ready to download and the private link has been emailed to you.";
  if (record.pdf_generated_at) return `Your report is ready to download. Email delivery is still pending; contact ${config.supportEmail} if you need help.`;
  if (record.status === "awaiting_payment") return "Waiting for payment confirmation from Stripe.";
  if (record.status === "failed") return `We could not complete the report automatically. Your payment is recorded; contact ${config.supportEmail} for help.`;
  if (record.analysis_completed_at) return "Analysis is complete and your PDF is being prepared.";
  if (record.payment_confirmed_at) return "Payment received. Your local market analysis is in progress.";
  return "Confirming your order.";
}

function storageIsWritable() {
  try {
    fs.accessSync(config.reportOutputDir, fs.constants.R_OK | fs.constants.W_OK);
    fs.accessSync(path.dirname(config.databasePath), fs.constants.R_OK | fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function securityHeaders(_request: Request, response: Response, next: NextFunction) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' https://checkout.stripe.com");
  if (config.nodeEnv === "production") response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
}

type RateBucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, RateBucket>();
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) if (bucket.resetAt <= now) rateBuckets.delete(key);
}, 60_000);
cleanupTimer.unref();

function rateLimit(name: string, limit: number, windowMs: number) {
  return (request: Request, response: Response, next: NextFunction) => {
    const key = `${name}:${request.ip ?? request.socket.remoteAddress ?? "unknown"}`;
    const now = Date.now();
    const current = rateBuckets.get(key);
    const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
    bucket.count += 1;
    rateBuckets.set(key, bucket);
    response.setHeader("RateLimit-Limit", String(limit));
    response.setHeader("RateLimit-Remaining", String(Math.max(0, limit - bucket.count)));
    if (bucket.count > limit) {
      response.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      response.status(429).json({ error: "Too many requests. Please try again shortly." });
      return;
    }
    next();
  };
}
