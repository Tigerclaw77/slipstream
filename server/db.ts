import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { IntakeValues, ReportRequestStatus } from "../src/productTypes.js";
import { config } from "./config.js";

export type FulfillmentStage = "analysis" | "pdf" | "email";

export type ReportRequestRecord = {
  id: string;
  public_token: string;
  download_token: string;
  business_name: string;
  website: string;
  address: string;
  email: string;
  notes: string;
  status: ReportRequestStatus;
  payment_status: string;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  payment_confirmed_at: string | null;
  report_json: string | null;
  analysis_completed_at: string | null;
  pdf_path: string | null;
  pdf_generated_at: string | null;
  email_sent_at: string | null;
  email_delivered_at: string | null;
  analysis_attempts: number;
  pdf_attempts: number;
  email_attempts: number;
  processing_started_at: string | null;
  retry_after: string | null;
  error_stage: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

const databaseDirectory = path.dirname(config.databasePath);
const storageDirectories = [databaseDirectory, config.reportOutputDir];

if (config.nodeEnv === "production") {
  for (const directory of storageDirectories) {
    if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
      throw new Error(`Production storage directory must already exist: ${directory}`);
    }
    fs.accessSync(directory, fs.constants.R_OK | fs.constants.W_OK);
  }
} else {
  fs.mkdirSync(databaseDirectory, { recursive: true });
  fs.mkdirSync(config.reportOutputDir, { recursive: true });
}

const database = new Database(config.databasePath);
database.pragma("journal_mode = WAL");
database.pragma("foreign_keys = ON");
database.pragma("busy_timeout = 5000");

database.exec(`
  CREATE TABLE IF NOT EXISTS report_requests (
    id TEXT PRIMARY KEY,
    public_token TEXT NOT NULL UNIQUE,
    download_token TEXT NOT NULL UNIQUE,
    business_name TEXT NOT NULL,
    website TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL,
    email TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL CHECK (status IN ('awaiting_payment', 'new', 'processing', 'completed', 'failed')),
    payment_status TEXT NOT NULL DEFAULT 'unpaid',
    stripe_session_id TEXT UNIQUE,
    stripe_payment_intent_id TEXT,
    report_json TEXT,
    pdf_path TEXT,
    email_sent_at TEXT,
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS stripe_events (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    report_request_id TEXT,
    processed_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS report_requests_status_idx
    ON report_requests(status, created_at DESC);
`);

const columns = new Set(
  (database.prepare("PRAGMA table_info(report_requests)").all() as Array<{ name: string }>).map((item) => item.name),
);

function ensureColumn(name: string, definition: string) {
  if (!columns.has(name)) database.exec(`ALTER TABLE report_requests ADD COLUMN ${name} ${definition}`);
}

ensureColumn("payment_confirmed_at", "TEXT");
ensureColumn("analysis_completed_at", "TEXT");
ensureColumn("pdf_generated_at", "TEXT");
ensureColumn("email_delivered_at", "TEXT");
ensureColumn("analysis_attempts", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("pdf_attempts", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("email_attempts", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("processing_started_at", "TEXT");
ensureColumn("retry_after", "TEXT");
ensureColumn("error_stage", "TEXT");

database.exec(`
  UPDATE report_requests
  SET payment_confirmed_at = COALESCE(payment_confirmed_at, CASE WHEN payment_status = 'paid' THEN updated_at END),
      analysis_completed_at = COALESCE(analysis_completed_at, CASE WHEN report_json IS NOT NULL THEN updated_at END),
      pdf_generated_at = COALESCE(pdf_generated_at, CASE WHEN pdf_path IS NOT NULL THEN completed_at END),
      email_delivered_at = COALESCE(email_delivered_at, email_sent_at)
`);

const selectColumns = `
  id, public_token, download_token, business_name, website, address, email, notes,
  status, payment_status, stripe_session_id, stripe_payment_intent_id, payment_confirmed_at,
  report_json, analysis_completed_at, pdf_path, pdf_generated_at, email_sent_at, email_delivered_at,
  analysis_attempts, pdf_attempts, email_attempts, processing_started_at, retry_after,
  error_stage, error_message, created_at, updated_at, completed_at
`;

export function createReportRequest(values: IntakeValues) {
  const now = new Date().toISOString();
  const record: ReportRequestRecord = {
    id: crypto.randomUUID(),
    public_token: crypto.randomBytes(24).toString("hex"),
    download_token: crypto.randomBytes(32).toString("hex"),
    business_name: values.businessName,
    website: values.website,
    address: values.address,
    email: values.email,
    notes: values.notes,
    status: "awaiting_payment",
    payment_status: "unpaid",
    stripe_session_id: null,
    stripe_payment_intent_id: null,
    payment_confirmed_at: null,
    report_json: null,
    analysis_completed_at: null,
    pdf_path: null,
    pdf_generated_at: null,
    email_sent_at: null,
    email_delivered_at: null,
    analysis_attempts: 0,
    pdf_attempts: 0,
    email_attempts: 0,
    processing_started_at: null,
    retry_after: null,
    error_stage: null,
    error_message: null,
    created_at: now,
    updated_at: now,
    completed_at: null,
  };

  database.prepare(`
    INSERT INTO report_requests (
      id, public_token, download_token, business_name, website, address, email, notes,
      status, payment_status, created_at, updated_at
    ) VALUES (
      @id, @public_token, @download_token, @business_name, @website, @address, @email, @notes,
      @status, @payment_status, @created_at, @updated_at
    )
  `).run(record);
  return record;
}

export function attachStripeSession(id: string, stripeSessionId: string) {
  database.prepare("UPDATE report_requests SET stripe_session_id = ?, updated_at = ? WHERE id = ?")
    .run(stripeSessionId, new Date().toISOString(), id);
}

export function markReportPaid(id: string, paymentIntentId: string | null) {
  const now = new Date().toISOString();
  const result = database.prepare(`
    UPDATE report_requests
    SET status = CASE WHEN status = 'awaiting_payment' THEN 'new' ELSE status END,
        payment_status = 'paid',
        stripe_payment_intent_id = COALESCE(stripe_payment_intent_id, ?),
        payment_confirmed_at = COALESCE(payment_confirmed_at, ?),
        error_message = CASE WHEN error_stage = 'payment' THEN NULL ELSE error_message END,
        error_stage = CASE WHEN error_stage = 'payment' THEN NULL ELSE error_stage END,
        updated_at = ?
    WHERE id = ? AND payment_status <> 'paid'
  `).run(paymentIntentId, now, now, id);
  return { newlyConfirmed: result.changes === 1, record: getReportRequest(id) };
}

const confirmStripeEvent = database.transaction(
  (eventId: string, eventType: string, requestId: string, paymentIntentId: string | null) => {
    const inserted = database.prepare(`
      INSERT OR IGNORE INTO stripe_events (event_id, event_type, report_request_id, processed_at)
      VALUES (?, ?, ?, ?)
    `).run(eventId, eventType, requestId, new Date().toISOString());
    if (inserted.changes === 0) return { duplicate: true, record: getReportRequest(requestId) };
    const payment = markReportPaid(requestId, paymentIntentId);
    return { duplicate: false, record: payment.record };
  },
);

export function confirmPaymentFromStripeEvent(
  eventId: string,
  eventType: string,
  requestId: string,
  paymentIntentId: string | null,
) {
  return confirmStripeEvent(eventId, eventType, requestId, paymentIntentId);
}

export function beginStage(id: string, stage: FulfillmentStage) {
  const now = new Date().toISOString();
  const attemptColumn = `${stage}_attempts`;
  const status = stage === "email" ? "completed" : "processing";
  database.prepare(`
    UPDATE report_requests
    SET status = ?, ${attemptColumn} = ${attemptColumn} + 1,
        processing_started_at = ?, retry_after = NULL,
        error_stage = NULL, error_message = NULL, updated_at = ?
    WHERE id = ?
  `).run(status, now, now, id);
  return getReportRequest(id);
}

export function completeAnalysis(id: string, reportJson: string) {
  const now = new Date().toISOString();
  database.prepare(`
    UPDATE report_requests
    SET report_json = ?, analysis_completed_at = ?, processing_started_at = NULL,
        retry_after = NULL, error_stage = NULL, error_message = NULL, updated_at = ?
    WHERE id = ?
  `).run(reportJson, now, now, id);
}

export function completePdf(id: string, pdfPath: string) {
  const now = new Date().toISOString();
  database.prepare(`
    UPDATE report_requests
    SET status = 'completed', pdf_path = ?, pdf_generated_at = ?, completed_at = ?,
        processing_started_at = NULL, retry_after = NULL,
        error_stage = NULL, error_message = NULL, updated_at = ?
    WHERE id = ?
  `).run(pdfPath, now, now, now, id);
}

export function completeEmail(id: string) {
  const now = new Date().toISOString();
  database.prepare(`
    UPDATE report_requests
    SET email_sent_at = ?, email_delivered_at = ?, processing_started_at = NULL,
        retry_after = NULL,
        error_stage = CASE WHEN error_stage = 'email' THEN NULL ELSE error_stage END,
        error_message = CASE WHEN error_stage = 'email' THEN NULL ELSE error_message END,
        updated_at = ?
    WHERE id = ?
  `).run(now, now, now, id);
}

export function failStage(
  id: string,
  stage: FulfillmentStage,
  message: string,
  retryAt: string | null,
  exhausted: boolean,
) {
  const now = new Date().toISOString();
  const status = stage === "email" ? "completed" : exhausted ? "failed" : "new";
  database.prepare(`
    UPDATE report_requests
    SET status = ?, processing_started_at = NULL, retry_after = ?,
        error_stage = ?, error_message = ?, updated_at = ?
    WHERE id = ?
  `).run(status, retryAt, stage, message, now, id);
}

export function getReportRequest(id: string) {
  return database.prepare(`SELECT ${selectColumns} FROM report_requests WHERE id = ?`)
    .get(id) as ReportRequestRecord | undefined;
}

export function getReportRequestByStripeSession(stripeSessionId: string) {
  return database.prepare(`SELECT ${selectColumns} FROM report_requests WHERE stripe_session_id = ?`)
    .get(stripeSessionId) as ReportRequestRecord | undefined;
}

export function listReportRequests() {
  return database.prepare(`SELECT ${selectColumns} FROM report_requests ORDER BY created_at DESC LIMIT 500`)
    .all() as ReportRequestRecord[];
}

export function listRecoverableReportRequests() {
  return database.prepare(`
    SELECT ${selectColumns} FROM report_requests
    WHERE payment_status = 'paid'
      AND (
        status IN ('new', 'processing')
        OR (status = 'completed' AND email_delivered_at IS NULL AND email_attempts < ?)
      )
  `).all(config.fulfillmentMaxAttempts) as ReportRequestRecord[];
}

export function resetStuckReportRequests(cutoff: string) {
  return database.prepare(`
    UPDATE report_requests
    SET status = 'new', processing_started_at = NULL, retry_after = NULL,
        error_stage = 'recovery', error_message = 'A stalled job was recovered after restart.', updated_at = ?
    WHERE status = 'processing' AND processing_started_at IS NOT NULL AND processing_started_at < ?
  `).run(new Date().toISOString(), cutoff).changes;
}

export function resetReportForRegeneration(id: string) {
  const now = new Date().toISOString();
  database.prepare(`
    UPDATE report_requests
    SET status = 'new', report_json = NULL, analysis_completed_at = NULL,
        pdf_path = NULL, pdf_generated_at = NULL,
        analysis_attempts = 0, pdf_attempts = 0,
        processing_started_at = NULL, retry_after = NULL,
        error_stage = NULL, error_message = NULL, completed_at = NULL, updated_at = ?
    WHERE id = ? AND payment_status = 'paid'
  `).run(now, id);
  return getReportRequest(id);
}

export function resetEmailForRetry(id: string) {
  const now = new Date().toISOString();
  database.prepare(`
    UPDATE report_requests
    SET email_sent_at = NULL, email_delivered_at = NULL, email_attempts = 0,
        retry_after = NULL, error_stage = NULL, error_message = NULL, updated_at = ?
    WHERE id = ? AND payment_status = 'paid' AND pdf_path IS NOT NULL
  `).run(now, id);
  return getReportRequest(id);
}

export function getDatabaseHealth() {
  try {
    const row = database.prepare("SELECT 1 AS ok").get() as { ok: number };
    return row.ok === 1;
  } catch {
    return false;
  }
}

export function getStripeEventCount(eventId: string) {
  const row = database.prepare("SELECT COUNT(*) AS count FROM stripe_events WHERE event_id = ?").get(eventId) as { count: number };
  return row.count;
}
