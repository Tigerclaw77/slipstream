import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const port = 4181;
const databasePath = path.resolve("data/smoke-production.sqlite");
const reportPath = path.resolve("data/smoke-reports");
await fs.mkdir(reportPath, { recursive: true });
const child = spawn(process.execPath, ["server-dist/server/index.js"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: "production",
    HOST: "127.0.0.1",
    PORT: String(port),
    APP_URL: "https://slipstream-smoke.invalid",
    DATABASE_PATH: databasePath,
    REPORT_OUTPUT_DIR: reportPath,
    STRIPE_SECRET_KEY: ["sk_live_", "51SmokeOnlyNotARealStripeKey000000000"].join(""),
    STRIPE_WEBHOOK_SECRET: "whsec_smoke_only",
    REPORT_PRICE_CENTS: "24900",
    ADMIN_TOKEN: "6d7f4c3a2b1908e7f6d5c4b3a291807f",
    SMTP_HOST: "smtp.invalid",
    SMTP_USER: "smoke",
    SMTP_PASS: "smoke",
    SMTP_FROM: "Slipstream Smoke <reports@slipstream-smoke.invalid>",
    SUPPORT_EMAIL: "support@slipstream-smoke.invalid",
    ANALYSIS_MODE: "live",
    OSM_USER_AGENT: "SlipstreamSmoke/1.0 (contact: support@slipstream-smoke.invalid)",
    DEV_BYPASS_PAYMENT: "false",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let logs = "";
child.stdout.on("data", (chunk) => { logs += chunk.toString(); });
child.stderr.on("data", (chunk) => { logs += chunk.toString(); });

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (response.ok) return;
    } catch {
      // The process is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Production server did not become healthy.\n${logs}`);
}

try {
  await waitForServer();
  for (const route of ["/", "/get-report", "/confirmation", "/admin", "/privacy", "/refund-policy"]) {
    const response = await fetch(`http://127.0.0.1:${port}${route}`);
    const html = await response.text();
    if (!response.ok || !html.includes("Slipstream SEO | Local Visibility Report")) {
      throw new Error(`SPA fallback failed for ${route} (${response.status}).`);
    }
  }
  const internalAsset = await fetch(`http://127.0.0.1:${port}/sales-intelligence/agencies.json`);
  if (internalAsset.status !== 404) throw new Error(`Internal research asset was public (${internalAsset.status}).`);
  const headers = await fetch(`http://127.0.0.1:${port}/`);
  if (headers.headers.get("x-content-type-options") !== "nosniff" || !headers.headers.get("content-security-policy")) {
    throw new Error("Production security headers were missing.");
  }
  console.log("Production smoke test passed: health, security headers, private research assets, static files, and SPA fallback.");
} finally {
  child.kill();
  await new Promise((resolve) => child.once("exit", resolve));
  await Promise.allSettled([
    fs.rm(databasePath, { force: true }),
    fs.rm(`${databasePath}-wal`, { force: true }),
    fs.rm(`${databasePath}-shm`, { force: true }),
    fs.rm(reportPath, { recursive: true, force: true }),
  ]);
}
