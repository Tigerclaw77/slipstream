import nodemailer from "nodemailer";
import type { LocalVisibilityReport } from "../src/productTypes.js";
import { config } from "./config.js";
import type { ReportRequestRecord } from "./db.js";

function createTransporter() {
  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: { user: config.smtp.user, pass: config.smtp.pass },
  });
}

export async function verifyEmailTransport() {
  if (!config.smtp.host || !config.smtp.user || !config.smtp.pass) return false;
  await createTransporter().verify();
  return true;
}

export async function sendReportEmail(request: ReportRequestRecord, report: LocalVisibilityReport) {
  const downloadUrl = `${config.appUrl}/api/reports/${request.id}/download?token=${request.download_token}`;

  if (!config.smtp.host || !config.smtp.user || !config.smtp.pass) {
    if (config.nodeEnv === "production") {
      throw new Error("Email delivery is not configured.");
    }
    console.info(`[delivery preview] ${request.email}: ${downloadUrl}`);
    return { sent: true, preview: true, downloadUrl };
  }

  const transporter = createTransporter();

  await transporter.sendMail({
    from: config.smtp.from,
    to: request.email,
    subject: `${report.business.name}: your Local Visibility Report is ready`,
    text: [
      `Your Slipstream SEO Local Visibility Report for ${report.business.name} is ready.`,
      "",
      `Download your report: ${downloadUrl}`,
      "",
      "The report covers your local opportunity, territory, nearby competitors, visibility findings, and a prioritized 90-day action roadmap.",
      "",
      "Slipstream SEO",
      `Questions? ${config.supportEmail}`,
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#172126;line-height:1.6">
        <p style="font-size:12px;font-weight:700;letter-spacing:.08em;color:#08635f">SLIPSTREAM SEO</p>
        <h1 style="font-size:26px;line-height:1.2">Your Local Visibility Report is ready.</h1>
        <p>The report for <strong>${escapeHtml(report.business.name)}</strong> covers your local opportunity, territory, nearby competitors, visibility findings, and a prioritized 90-day action roadmap.</p>
        <p style="margin:28px 0"><a href="${downloadUrl}" style="display:inline-block;background:#08635f;color:#fff;text-decoration:none;padding:13px 20px;border-radius:6px;font-weight:700">Download your report</a></p>
        <p style="font-size:13px;color:#667176">This private link is tied to your report. Keep this email for future reference.</p>
        <p style="font-size:13px;color:#667176">Questions? <a href="mailto:${config.supportEmail}">${config.supportEmail}</a></p>
      </div>
    `,
  });

  return { sent: true, downloadUrl };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}
