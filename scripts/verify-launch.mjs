import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import Stripe from "stripe";

const verificationRoot = path.resolve("data/launch-verification");
const databasePath = path.join(verificationRoot, "verification.sqlite");
const reportDir = path.join(verificationRoot, "reports");
await fsp.rm(verificationRoot, { recursive: true, force: true });
await fsp.mkdir(reportDir, { recursive: true });

Object.assign(process.env, {
  NODE_ENV: "development",
  DATABASE_PATH: databasePath,
  REPORT_OUTPUT_DIR: reportDir,
  APP_URL: "http://127.0.0.1:4192",
  HOST: "127.0.0.1",
  PORT: "4192",
  ANALYSIS_MODE: "sample",
  DEV_BYPASS_PAYMENT: "false",
  QUEUE_CONCURRENCY: "2",
  FULFILLMENT_MAX_ATTEMPTS: "1",
  FULFILLMENT_RETRY_BASE_MS: "500",
  STUCK_JOB_MINUTES: "5",
  SMTP_HOST: "127.0.0.1",
  SMTP_PORT: "1",
  SMTP_USER: "verification",
  SMTP_PASS: "verification",
  SMTP_FROM: "Slipstream Verification <reports@example.com>",
});

const db = await import("../server-dist/server/db.js");
const queue = await import("../server-dist/server/queue.js");

const intake = (name, email = "owner@example.com") => ({
  businessName: name,
  website: "https://example.com",
  address: "123 Main Street, Austin, TX 78701",
  email,
  notes: "",
});
const reportJson = (name) => JSON.stringify({ business: { name } });

// Duplicate Stripe events remain a single state transition and never alter a completed order.
const paid = db.createReportRequest(intake("Idempotent Vision"));
db.attachStripeSession(paid.id, "cs_test_idempotent");
const firstEvent = db.confirmPaymentFromStripeEvent("evt_duplicate", "checkout.session.completed", paid.id, "pi_test");
assert.equal(firstEvent.duplicate, false);
const paidPdf = path.join(reportDir, `${paid.id}.pdf`);
await fsp.writeFile(paidPdf, "%PDF-1.4\n%%EOF");
db.completeAnalysis(paid.id, reportJson("Idempotent Vision"));
db.completePdf(paid.id, paidPdf);
db.completeEmail(paid.id);
const beforeDuplicate = db.getReportRequest(paid.id);
const duplicateEvent = db.confirmPaymentFromStripeEvent("evt_duplicate", "checkout.session.completed", paid.id, "pi_test");
const afterDuplicate = db.getReportRequest(paid.id);
assert.equal(duplicateEvent.duplicate, true);
assert.equal(db.getStripeEventCount("evt_duplicate"), 1);
assert.equal(afterDuplicate.status, "completed");
assert.equal(afterDuplicate.completed_at, beforeDuplicate.completed_at);
assert.equal(afterDuplicate.email_delivered_at, beforeDuplicate.email_delivered_at);

// SMTP failure leaves the PDF completed and retrying email does not clear analysis or PDF state.
const emailFailure = db.createReportRequest(intake("Delivery Recovery Vision"));
db.markReportPaid(emailFailure.id, "pi_email_failure");
const emailPdf = path.join(reportDir, `${emailFailure.id}.pdf`);
await fsp.writeFile(emailPdf, "%PDF-1.4\n%%EOF");
db.completeAnalysis(emailFailure.id, reportJson("Delivery Recovery Vision"));
db.completePdf(emailFailure.id, emailPdf);
db.beginStage(emailFailure.id, "email");
db.failStage(emailFailure.id, "email", "SMTP unavailable", null, true);
const failedDelivery = db.getReportRequest(emailFailure.id);
assert.equal(failedDelivery.status, "completed");
assert.equal(failedDelivery.pdf_path, emailPdf);
assert.equal(failedDelivery.email_delivered_at, null);
db.resetEmailForRetry(emailFailure.id);
const emailRetry = db.getReportRequest(emailFailure.id);
assert.ok(emailRetry.report_json);
assert.equal(emailRetry.pdf_path, emailPdf);
assert.equal(emailRetry.email_attempts, 0);

// Startup recovery returns a stuck processing job to the resumable queue.
const stuck = db.createReportRequest(intake("Restart Recovery Vision"));
db.markReportPaid(stuck.id, "pi_stuck");
db.beginStage(stuck.id, "analysis");
assert.equal(db.resetStuckReportRequests(new Date(Date.now() + 1000).toISOString()), 1);
assert.ok(db.listRecoverableReportRequests().some((record) => record.id === stuck.id));

// Concurrent delivery work is bounded by configured queue concurrency.
const concurrent = [];
for (let index = 0; index < 5; index += 1) {
  const request = db.createReportRequest(intake(`Concurrent Vision ${index}`, `owner${index}@example.com`));
  db.markReportPaid(request.id, `pi_concurrent_${index}`);
  const pdfPath = path.join(reportDir, `${request.id}.pdf`);
  await fsp.writeFile(pdfPath, "%PDF-1.4\n%%EOF");
  db.completeAnalysis(request.id, reportJson(request.business_name));
  db.completePdf(request.id, pdfPath);
  concurrent.push(request.id);
}
const originalConsoleError = console.error;
console.error = () => undefined;
for (const id of concurrent) queue.enqueueReport(id);
const queueState = queue.getQueueHealth();
assert.equal(queueState.active, 2);
assert.equal(queueState.queued, 3);
assert.equal(queueState.concurrency, 2);
for (let attempt = 0; attempt < 100 && queue.getQueueHealth().active > 0; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 10));
}
console.error = originalConsoleError;

// The HTTP webhook path rejects duplicate delivery without changing a completed order.
const webhookOrder = db.createReportRequest(intake("Webhook Verification Vision"));
db.attachStripeSession(webhookOrder.id, "cs_test_webhook_duplicate");
const webhookPdf = path.join(reportDir, `${webhookOrder.id}.pdf`);
await fsp.writeFile(webhookPdf, "%PDF-1.4\n%%EOF");
db.completeAnalysis(webhookOrder.id, reportJson("Webhook Verification Vision"));
db.completePdf(webhookOrder.id, webhookPdf);
db.completeEmail(webhookOrder.id);
const webhookCompletedAt = db.getReportRequest(webhookOrder.id).completed_at;

// The completed report remains downloadable through the authenticated URL.
const webhookSecret = "whsec_launch_verification";
const child = spawn(process.execPath, ["server-dist/server/index.js"], {
  cwd: process.cwd(),
  env: { ...process.env, STRIPE_SECRET_KEY: "sk_test_launch_verification", STRIPE_WEBHOOK_SECRET: webhookSecret },
  stdio: ["ignore", "pipe", "pipe"],
});
let childLogs = "";
child.stdout.on("data", (chunk) => { childLogs += chunk.toString(); });
child.stderr.on("data", (chunk) => { childLogs += chunk.toString(); });
try {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const health = await fetch("http://127.0.0.1:4192/api/health");
      if (health.ok) break;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const webhookPayload = JSON.stringify({
    id: "evt_http_duplicate",
    object: "event",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_webhook_duplicate",
        object: "checkout.session",
        client_reference_id: webhookOrder.id,
        metadata: { reportRequestId: webhookOrder.id },
        payment_intent: "pi_http_duplicate",
        payment_status: "paid",
      },
    },
  });
  const signature = Stripe.webhooks.generateTestHeaderString({ payload: webhookPayload, secret: webhookSecret });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const webhookResponse = await fetch("http://127.0.0.1:4192/api/stripe/webhook", {
      method: "POST",
      headers: { "content-type": "application/json", "stripe-signature": signature },
      body: webhookPayload,
    });
    assert.equal(webhookResponse.status, 200);
  }
  const webhookAfterDuplicate = db.getReportRequest(webhookOrder.id);
  assert.equal(db.getStripeEventCount("evt_http_duplicate"), 1);
  assert.equal(webhookAfterDuplicate.status, "completed");
  assert.equal(webhookAfterDuplicate.completed_at, webhookCompletedAt);
  assert.ok(webhookAfterDuplicate.email_delivered_at);

  const download = await fetch(`http://127.0.0.1:4192/api/reports/${paid.id}/download?token=${paid.download_token}`);
  assert.equal(download.status, 200, childLogs);
  assert.match(download.headers.get("content-type") ?? "", /application\/pdf/);
} finally {
  child.kill();
  await new Promise((resolve) => child.once("exit", resolve));
}

// Invalid production settings fail before the application can accept traffic.
const validProduction = {
  ...process.env,
  NODE_ENV: "production",
  APP_URL: "https://slipstream.example.com",
  STRIPE_SECRET_KEY: ["sk_live_", "51VerificationOnlyNotARealKey000000"].join(""),
  STRIPE_WEBHOOK_SECRET: "whsec_verification_only",
  ADMIN_TOKEN: "7e6d5c4b3a291807f6e5d4c3b2a1908f",
  SUPPORT_EMAIL: "support@slipstream.example.com",
  REPORT_PRICE_CENTS: "24900",
  ANALYSIS_MODE: "live",
  OSM_USER_AGENT: "SlipstreamVerification/1.0 (contact: support@slipstream.example.com)",
  DEV_BYPASS_PAYMENT: "false",
  PORT: "4193",
};
for (const [name, override, expected] of [
  ["HTTP APP_URL", { APP_URL: "http://slipstream.example.com" }, "APP_URL must use HTTPS"],
  ["weak admin token", { ADMIN_TOKEN: "admin" }, "ADMIN_TOKEN must be a strong random value"],
  ["test Stripe key", { STRIPE_SECRET_KEY: "sk_test_not_allowed" }, "STRIPE_SECRET_KEY must be a live Stripe key"],
  ["invalid price", { REPORT_PRICE_CENTS: "0" }, "REPORT_PRICE_CENTS must be an integer"],
]) {
  const result = spawnSync(process.execPath, ["server-dist/server/index.js"], {
    cwd: process.cwd(),
    env: { ...validProduction, ...override, DATABASE_PATH: path.join(verificationRoot, `${name}.sqlite`) },
    encoding: "utf8",
    timeout: 5000,
  });
  assert.notEqual(result.status, 0, `${name} unexpectedly started production`);
  assert.match(`${result.stdout}${result.stderr}`, new RegExp(expected));
}

const absentReportDirectory = path.join(verificationRoot, "absent-storage", "reports");
const missingStorage = spawnSync(process.execPath, ["server-dist/server/index.js"], {
  cwd: process.cwd(),
  env: { ...validProduction, REPORT_OUTPUT_DIR: absentReportDirectory },
  encoding: "utf8",
  timeout: 5000,
});
assert.notEqual(missingStorage.status, 0, "production unexpectedly created missing storage");
assert.match(`${missingStorage.stdout}${missingStorage.stderr}`, /Production storage directory must already exist/);

assert.equal(fs.existsSync(path.resolve("dist/sales-intelligence")), false);
assert.equal(fs.readdirSync(path.resolve("dist/assets")).some((name) => /^App-.*\.js$/.test(name)), false);
assert.match(fs.readFileSync(path.resolve("server-dist/server/index.js"), "utf8"), /CHECKOUT_SESSION_ID/);

console.log("Launch verification passed: payment idempotency, delivery isolation, restart recovery, queue bounds, download authorization, private research assets, and production config validation.");
