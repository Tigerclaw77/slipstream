import "dotenv/config";
import path from "node:path";
import {
  DEFAULT_DELIVERY_TIMEFRAME,
  DEFAULT_REPORT_PRICE_CENTS,
  DEFAULT_SUPPORT_EMAIL,
} from "../src/productConfig.js";

function boolFromEnv(value: string | undefined, fallback = false) {
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
}

function intFromEnv(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  host: process.env.HOST ?? (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1"),
  port: intFromEnv(process.env.PORT, 4173),
  appUrl: (process.env.APP_URL ?? "http://127.0.0.1:4173").replace(/\/$/, ""),
  databasePath: path.resolve(process.env.DATABASE_PATH ?? "data/slipstream.sqlite"),
  reportOutputDir: path.resolve(process.env.REPORT_OUTPUT_DIR ?? "data/reports"),
  reportPriceCents: intFromEnv(process.env.REPORT_PRICE_CENTS, DEFAULT_REPORT_PRICE_CENTS),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  adminToken: process.env.ADMIN_TOKEN ?? "",
  supportEmail: process.env.SUPPORT_EMAIL ?? DEFAULT_SUPPORT_EMAIL,
  deliveryTimeframe: process.env.DELIVERY_TIMEFRAME ?? DEFAULT_DELIVERY_TIMEFRAME,
  queueConcurrency: intFromEnv(process.env.QUEUE_CONCURRENCY, 2),
  fulfillmentMaxAttempts: intFromEnv(process.env.FULFILLMENT_MAX_ATTEMPTS, 3),
  fulfillmentRetryBaseMs: intFromEnv(process.env.FULFILLMENT_RETRY_BASE_MS, 2000),
  stuckJobMinutes: intFromEnv(process.env.STUCK_JOB_MINUTES, 20),
  devBypassPayment: boolFromEnv(process.env.DEV_BYPASS_PAYMENT, false),
  analysisMode: process.env.ANALYSIS_MODE === "sample" ? "sample" : "live",
  osmUserAgent:
    process.env.OSM_USER_AGENT ?? "SlipstreamSEO/1.0 (contact: reports@slipstreamseo.com)",
  overpassEndpoints: (process.env.OVERPASS_ENDPOINTS ??
    "https://overpass.private.coffee/api/interpreter,https://overpass-api.de/api/interpreter")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: intFromEnv(process.env.SMTP_PORT, 587),
    secure: boolFromEnv(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.SMTP_FROM ?? "Slipstream SEO <reports@slipstreamseo.com>",
  },
} as const;

export function assertProductionConfig() {
  if (config.nodeEnv !== "production") return;

  const missing = [
    ["APP_URL", process.env.APP_URL ?? ""],
    ["DATABASE_PATH", process.env.DATABASE_PATH ?? ""],
    ["REPORT_OUTPUT_DIR", process.env.REPORT_OUTPUT_DIR ?? ""],
    ["STRIPE_SECRET_KEY", config.stripeSecretKey],
    ["STRIPE_WEBHOOK_SECRET", config.stripeWebhookSecret],
    ["REPORT_PRICE_CENTS", process.env.REPORT_PRICE_CENTS ?? ""],
    ["ADMIN_TOKEN", config.adminToken],
    ["SMTP_HOST", config.smtp.host],
    ["SMTP_USER", config.smtp.user],
    ["SMTP_PASS", config.smtp.pass],
    ["SMTP_FROM", process.env.SMTP_FROM ?? ""],
    ["SUPPORT_EMAIL", process.env.SUPPORT_EMAIL ?? ""],
    ["ANALYSIS_MODE", process.env.ANALYSIS_MODE ?? ""],
    ["OSM_USER_AGENT", process.env.OSM_USER_AGENT ?? ""],
  ].filter(([, value]) => !value);

  if (missing.length > 0) {
    throw new Error(`Missing production environment variables: ${missing.map(([key]) => key).join(", ")}`);
  }

  if (config.devBypassPayment) {
    throw new Error("DEV_BYPASS_PAYMENT cannot be enabled in production.");
  }

  if (config.analysisMode !== "live") {
    throw new Error("ANALYSIS_MODE must be live in production.");
  }

  let appUrl: URL;
  try {
    appUrl = new URL(config.appUrl);
  } catch {
    throw new Error("APP_URL must be a valid HTTPS URL in production.");
  }
  if (appUrl.protocol !== "https:") {
    throw new Error("APP_URL must use HTTPS in production.");
  }
  if (!Number.isSafeInteger(config.reportPriceCents) || config.reportPriceCents < 100 || config.reportPriceCents > 100_000) {
    throw new Error("REPORT_PRICE_CENTS must be an integer between 100 and 100000.");
  }
  if (!config.stripeSecretKey.startsWith("sk_live_")) {
    throw new Error("STRIPE_SECRET_KEY must be a live Stripe key in production.");
  }
  if (config.adminToken.length < 32 || /replace|change|admin|password|secret/i.test(config.adminToken)) {
    throw new Error("ADMIN_TOKEN must be a strong random value of at least 32 characters.");
  }
  if (!/^\S+@\S+\.\S+$/.test(config.supportEmail)) {
    throw new Error("SUPPORT_EMAIL must be a valid email address.");
  }
  if (!Number.isInteger(config.queueConcurrency) || config.queueConcurrency < 1 || config.queueConcurrency > 10) {
    throw new Error("QUEUE_CONCURRENCY must be an integer between 1 and 10.");
  }
  if (!Number.isInteger(config.fulfillmentMaxAttempts) || config.fulfillmentMaxAttempts < 1 || config.fulfillmentMaxAttempts > 8) {
    throw new Error("FULFILLMENT_MAX_ATTEMPTS must be an integer between 1 and 8.");
  }
  if (!Number.isInteger(config.fulfillmentRetryBaseMs) || config.fulfillmentRetryBaseMs < 500 || config.fulfillmentRetryBaseMs > 60_000) {
    throw new Error("FULFILLMENT_RETRY_BASE_MS must be an integer between 500 and 60000.");
  }
  if (!Number.isInteger(config.stuckJobMinutes) || config.stuckJobMinutes < 5 || config.stuckJobMinutes > 240) {
    throw new Error("STUCK_JOB_MINUTES must be an integer between 5 and 240.");
  }
}
