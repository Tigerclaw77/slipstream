import fs from "node:fs";
import type { LocalVisibilityReport } from "../src/productTypes.js";
import { generateAnalysis } from "./analysis.js";
import { config } from "./config.js";
import {
  beginStage,
  completeAnalysis,
  completeEmail,
  completePdf,
  failStage,
  getReportRequest,
  listRecoverableReportRequests,
  resetStuckReportRequests,
  type FulfillmentStage,
  type ReportRequestRecord,
} from "./db.js";
import { sendReportEmail } from "./email.js";
import { createReportPdf } from "./pdf.js";

const activeJobs = new Set<string>();
const queuedJobs = new Set<string>();
const pendingJobs: string[] = [];
const retryTimers = new Map<string, NodeJS.Timeout>();

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 1000);
  return "Report fulfillment failed unexpectedly.";
}

function attemptsFor(record: ReportRequestRecord, stage: FulfillmentStage) {
  if (stage === "analysis") return record.analysis_attempts;
  if (stage === "pdf") return record.pdf_attempts;
  return record.email_attempts;
}

function scheduleRetry(id: string, retryAt: string) {
  const current = retryTimers.get(id);
  if (current) clearTimeout(current);
  const delay = Math.max(0, new Date(retryAt).getTime() - Date.now());
  const timer = setTimeout(() => {
    retryTimers.delete(id);
    enqueueReport(id);
  }, delay);
  timer.unref();
  retryTimers.set(id, timer);
}

function handleStageFailure(id: string, stage: FulfillmentStage, error: unknown) {
  const record = getReportRequest(id);
  if (!record) return;
  const attempts = attemptsFor(record, stage);
  const exhausted = attempts >= config.fulfillmentMaxAttempts;
  const retryDelay = Math.min(5 * 60_000, config.fulfillmentRetryBaseMs * (2 ** Math.max(0, attempts - 1)));
  const retryAt = exhausted ? null : new Date(Date.now() + retryDelay).toISOString();
  const message = errorMessage(error);
  failStage(id, stage, message, retryAt, exhausted);
  console.error(`Report ${id} ${stage} stage failed on attempt ${attempts}`, error);
  if (retryAt) scheduleRetry(id, retryAt);
}

async function processReport(id: string) {
  if (activeJobs.has(id)) return;
  activeJobs.add(id);

  try {
    let request = getReportRequest(id);
    if (!request || request.payment_status !== "paid") return;

    if (request.retry_after && new Date(request.retry_after).getTime() > Date.now()) {
      scheduleRetry(id, request.retry_after);
      return;
    }

    if (!request.report_json) {
      try {
        beginStage(id, "analysis");
        request = getReportRequest(id)!;
        const report = await generateAnalysis(request);
        completeAnalysis(id, JSON.stringify(report));
      } catch (error) {
        handleStageFailure(id, "analysis", error);
        return;
      }
    }

    request = getReportRequest(id)!;
    if (!request.pdf_path || !fs.existsSync(request.pdf_path)) {
      try {
        beginStage(id, "pdf");
        const report = JSON.parse(request.report_json!) as LocalVisibilityReport;
        const pdfPath = await createReportPdf(report, id);
        completePdf(id, pdfPath);
      } catch (error) {
        handleStageFailure(id, "pdf", error);
        return;
      }
    }

    request = getReportRequest(id)!;
    if (!request.email_delivered_at) {
      try {
        beginStage(id, "email");
        request = getReportRequest(id)!;
        const report = JSON.parse(request.report_json!) as LocalVisibilityReport;
        const delivery = await sendReportEmail(request, report);
        if (!delivery.sent) throw new Error("Email delivery did not confirm acceptance.");
        completeEmail(id);
      } catch (error) {
        handleStageFailure(id, "email", error);
      }
    }
  } finally {
    activeJobs.delete(id);
  }
}

function drainQueue() {
  while (activeJobs.size < config.queueConcurrency && pendingJobs.length > 0) {
    const id = pendingJobs.shift()!;
    queuedJobs.delete(id);
    void processReport(id).finally(drainQueue);
  }
}

export function enqueueReport(id: string) {
  const record = getReportRequest(id);
  if (!record || record.payment_status !== "paid") return false;
  if (record.status === "failed") return false;
  if (record.pdf_path && record.email_delivered_at) return false;
  if (!record.report_json && record.analysis_attempts >= config.fulfillmentMaxAttempts) return false;
  if (record.report_json && !record.pdf_path && record.pdf_attempts >= config.fulfillmentMaxAttempts) return false;
  if (record.pdf_path && !record.email_delivered_at && record.email_attempts >= config.fulfillmentMaxAttempts) return false;
  if (activeJobs.has(id) || queuedJobs.has(id)) return false;
  if (record.retry_after && new Date(record.retry_after).getTime() > Date.now()) {
    scheduleRetry(id, record.retry_after);
    return true;
  }
  queuedJobs.add(id);
  pendingJobs.push(id);
  drainQueue();
  return true;
}

export function recoverReportQueue() {
  const cutoff = new Date(Date.now() - config.stuckJobMinutes * 60_000).toISOString();
  const recoveredStuckJobs = resetStuckReportRequests(cutoff);
  const recoverable = listRecoverableReportRequests();
  for (const request of recoverable) enqueueReport(request.id);
  return { recoveredStuckJobs, queued: recoverable.length };
}

export function getQueueHealth() {
  return {
    active: activeJobs.size,
    queued: pendingJobs.length,
    concurrency: config.queueConcurrency,
  };
}
