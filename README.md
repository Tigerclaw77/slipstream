# Slipstream SEO

Slipstream SEO sells a single Local Visibility Report for independent eye care practices. A purchaser enters the practice details, pays through Stripe Checkout, and receives a private PDF download link by email.

## Product flow

1. Customer visits `/` and selects **Get My Local Visibility Report**.
2. Customer enters business name, optional website, full address, email, and optional notes.
3. The server validates the intake, persists an unpaid request, and creates a hosted Stripe Checkout Session.
4. The confirmation page verifies the Checkout Session directly with Stripe. Verified webhooks provide an idempotent second path to payment confirmation.
5. Slipstream geocodes the address, retrieves public OpenStreetMap competitor data, reuses the territory engine, checks a focused set of website signals, and creates the branded PDF.
6. Analysis, PDF generation, and email delivery are persisted independently. The PDF remains downloadable if email delivery needs to retry.
7. The customer receives a private download link by email. Stage status and recovery actions remain visible at `/admin`.

The customer application does not bundle or serve Sales Intelligence, Authority Experiments, Architecture Experiments, Knowledge Network validation, lab routes, research JSON, or exports. `npm run research:export` writes ignored files under `data/internal-exports/` for migration to Skytree.

## Local setup

Requirements: Node.js 22 or newer.

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. The API runs on port `4173` and Vite proxies `/api` requests to it.

For a local purchase-to-PDF test without a Stripe charge, set:

```dotenv
DEV_BYPASS_PAYMENT=true
ANALYSIS_MODE=sample
ADMIN_TOKEN=choose-a-local-token
```

The bypass is rejected when `NODE_ENV=production`. When SMTP is not configured in development, the private delivery link is logged and the report still completes. Production requires complete SMTP configuration.

## Stripe setup

Create `POST https://your-domain.example/api/stripe/webhook` and subscribe it to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`

Set `STRIPE_SECRET_KEY` and the endpoint signing secret in `STRIPE_WEBHOOK_SECRET`. The one-time price is created inline using `REPORT_PRICE_CENTS`.

The Stripe success URL includes `{CHECKOUT_SESSION_ID}`. `/confirmation` calls the authenticated reconciliation endpoint before polling order status, so successful payment does not depend exclusively on webhook delivery. Stripe event IDs are persisted to prevent duplicate fulfillment.

## Production deployment

This is a long-running Node application, not a serverless-only deployment. Deploy it to a Node host with a persistent volume mounted for `data/`.

```text
npm run build
npm start
```

Set `NODE_ENV=production` and route HTTPS traffic to `PORT`. Express serves the Vite build and returns `index.html` for public SPA routes.

Provision the directories named by `DATABASE_PATH` and `REPORT_OUTPUT_DIR` on a persistent volume before startup. Production deliberately refuses to create missing storage directories so an unmounted volume cannot silently fall back to ephemeral disk. Back up the SQLite database and generated PDFs together. A single application instance with a persistent volume is the intended launch model. Multiple instances require shared queue, database, rate-limit storage, and object storage.

Production startup rejects HTTP public URLs, test Stripe keys, weak admin tokens, invalid prices, local bypass mode, and incomplete SMTP/support configuration. `/api/health` checks database access, writable storage, Stripe/SMTP configuration, and queue depth.

## Environment variables

| Variable | Required in production | Purpose |
| --- | --- | --- |
| `APP_URL` | Yes | Public HTTPS origin used for checkout returns and report links |
| `HOST` | No | Bind host; defaults to `0.0.0.0` in production |
| `PORT` | No | Node listener port; defaults to `4173` |
| `DATABASE_PATH` | Yes | SQLite path on a pre-provisioned persistent volume |
| `REPORT_OUTPUT_DIR` | Yes | Existing generated-PDF directory on the same persistent volume |
| `STRIPE_SECRET_KEY` | Yes | Live server-side Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signature secret |
| `REPORT_PRICE_CENTS` | Yes | One-time report price; launch value is `24900` |
| `SMTP_HOST` | Yes | SMTP server |
| `SMTP_PORT` | No | SMTP port; defaults to `587` |
| `SMTP_SECURE` | No | Use implicit TLS when `true` |
| `SMTP_USER` | Yes | SMTP username |
| `SMTP_PASS` | Yes | SMTP password |
| `SMTP_FROM` | Yes | Report sender name and address |
| `SUPPORT_EMAIL` | Yes | Customer-visible support address |
| `DELIVERY_TIMEFRAME` | No | Delivery expectation shown before and after checkout |
| `ADMIN_TOKEN` | Yes | Random token of at least 32 characters |
| `QUEUE_CONCURRENCY` | No | Maximum simultaneous fulfillment jobs; defaults to `2` |
| `FULFILLMENT_MAX_ATTEMPTS` | No | Attempts per stage; defaults to `3` |
| `FULFILLMENT_RETRY_BASE_MS` | No | Initial exponential retry delay; defaults to `2000` |
| `STUCK_JOB_MINUTES` | No | Processing age before startup recovery; defaults to `20` |
| `ANALYSIS_MODE` | Yes | Use `live`; `sample` is for local QA only |
| `OSM_USER_AGENT` | Yes | Identifies the application and contact to OSM services |
| `OVERPASS_ENDPOINTS` | No | Ordered comma-separated Overpass endpoints used for failover |
| `DEV_BYPASS_PAYMENT` | No | Local-only payment bypass; must be `false` in production |

No secret belongs in source control. Keep `.env` local and configure production values through the hosting provider.

## Operational recovery

- Paid requests with incomplete stages are re-queued when the server restarts.
- Stale processing jobs are returned to the queue during startup recovery.
- Analysis, PDF, and email attempts use bounded exponential backoff.
- Failed report generation and email delivery have separate retry actions in `/admin`.
- Email failure leaves an already-generated report completed and downloadable.
- Download links use a high-entropy per-report token and are not listed in public APIs.
- Customer website fetches reject local and private network addresses before requesting content.

## Launch verification

```text
npm run build
npm run test:launch
npm run test:smoke
```

Launch verification covers duplicate payment events, SMTP-stage isolation, restart recovery, queue concurrency, authenticated download, research-asset exclusion, and production configuration rejection. Production smoke covers health, security headers, private research paths, static files, and SPA fallback.

Customer policies are available at `/privacy` and `/refund-policy`. Customer support is configured through `SUPPORT_EMAIL`.

## Data notes

Local market and competitor information comes from public OpenStreetMap services and can be incomplete. Reports include this limitation. Slipstream's output is a prioritized business assessment, not a guarantee of rankings or revenue.
