import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Download,
  FileText,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MapPinned,
  RefreshCw,
  ShieldCheck,
  Target,
} from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { normalizeIntake, validateIntake } from "./lib/intakeValidation";
import {
  BUSINESS_IDENTITY,
  DEFAULT_DELIVERY_TIMEFRAME,
  DEFAULT_REPORT_PRICE_CENTS,
  DEFAULT_SUPPORT_EMAIL,
  formatPrice,
} from "./productConfig";
import type {
  AdminReportRequest,
  IntakeErrors,
  IntakeValues,
  PublicReportRequest,
  PublicProductConfig,
  ReportRequestStatus,
} from "./productTypes";

const INTAKE_STORAGE_KEY = "slipstream-report-intake";
const defaultProductConfig: PublicProductConfig = {
  priceCents: DEFAULT_REPORT_PRICE_CENTS,
  supportEmail: DEFAULT_SUPPORT_EMAIL,
  deliveryTimeframe: DEFAULT_DELIVERY_TIMEFRAME,
};
const ProductConfigContext = createContext(defaultProductConfig);
const emptyIntake: IntakeValues = {
  businessName: "",
  website: "",
  address: "",
  email: "",
  notes: "",
};

function useProductConfig() {
  return useContext(ProductConfigContext);
}

function savedIntake() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(INTAKE_STORAGE_KEY) ?? "null") as Partial<IntakeValues> | null;
    return parsed ? { ...emptyIntake, ...parsed } : emptyIntake;
  } catch {
    return emptyIntake;
  }
}

function navigate(path: string) {
  window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function ProductLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        navigate(href);
      }}
    >
      {children}
    </a>
  );
}

function Brand() {
  return (
    <ProductLink href="/" className="product-brand" aria-label="Slipstream SEO home">
      <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
      <span>Slipstream <strong>SEO</strong></span>
    </ProductLink>
  );
}

function PublicHeader() {
  return (
    <header className="public-header">
      <Brand />
      <ProductLink href="/get-report" className="header-cta">
        Get My Report <ArrowRight size={16} aria-hidden="true" />
      </ProductLink>
    </header>
  );
}

function LandingPage() {
  const { priceCents, deliveryTimeframe, supportEmail } = useProductConfig();
  const price = formatPrice(priceCents);
  return (
    <div className="public-site">
      <PublicHeader />
      <main>
        <section className="hero-band">
          <div className="hero-report-visual" aria-hidden="true">
            <div className="report-sheet report-sheet-back" />
            <div className="report-sheet report-sheet-front">
              <span className="sample-label">LOCAL VISIBILITY REPORT</span>
              <div className="sample-score"><strong>74</strong><small>/100</small></div>
              <div className="sample-bars"><i /><i /><i /><i /></div>
              <div className="sample-map">
                <span className="map-road road-one" /><span className="map-road road-two" />
                <b className="map-pin pin-main" /><b className="map-pin pin-a" /><b className="map-pin pin-b" /><b className="map-pin pin-c" />
              </div>
            </div>
          </div>
          <div className="hero-copy">
            <p className="product-eyebrow">Built for independent eye care practices</p>
            <h1>See where your local visibility is being won or lost.</h1>
            <p className="hero-lede">A focused report on your market, nearby competitors, website signals, and the next actions most likely to improve local discovery.</p>
            <div className="hero-actions">
              <ProductLink href="/get-report" className="primary-button">
                Get My Local Visibility Report <ArrowRight size={18} aria-hidden="true" />
              </ProductLink>
              <span className="price-note">{price} one time. No subscription.</span>
            </div>
            <div className="trust-row">
              <span><ShieldCheck size={16} /> Secure Stripe checkout</span>
              <span><Clock3 size={16} /> Clear 90-day roadmap</span>
              <span><FileText size={16} /> Professional PDF</span>
              <span><Clock3 size={16} /> {deliveryTimeframe}</span>
            </div>
          </div>
        </section>

        <section className="deliverables-band" id="report">
          <div className="section-heading">
            <p className="product-eyebrow">What you receive</p>
            <h2>One report. Ten business decisions made clearer.</h2>
            <p>Designed to be read in under 10 minutes and acted on immediately.</p>
          </div>
          <div className="deliverable-grid">
            <Deliverable icon={<Target />} number="01" title="Opportunity score" text="A plain-English view of how much local visibility upside exists." />
            <Deliverable icon={<MapPinned />} number="02" title="Territory and map" text="Your practical focus radius and the nearby competitive set." />
            <Deliverable icon={<BarChart3 />} number="03" title="Competition density" text="How pressure changes within one, three, five, and ten miles." />
            <Deliverable icon={<FileText />} number="04" title="Visibility findings" text="The website and local authority signals that deserve attention." />
            <Deliverable icon={<CheckCircle2 />} number="05" title="Biggest wins" text="The short list of opportunities with the clearest business value." />
            <Deliverable icon={<ArrowRight />} number="06" title="90-day roadmap" text="What to do first, next, and later, in a practical sequence." />
          </div>
        </section>

        <section className="sample-band">
          <div className="sample-copy">
            <p className="product-eyebrow">A report you can use</p>
            <h2>Clear enough for an owner. Specific enough for the person doing the work.</h2>
            <p>Slipstream turns local market data into a restrained, branded PDF with an executive summary, maps, competitor context, and prioritized actions. No analytics theater. No platform to learn.</p>
            <ul className="check-list">
              <li><Check size={17} /> Findings explained without exposing unnecessary scoring mechanics</li>
              <li><Check size={17} /> Recommendations connected to the practice's actual market</li>
              <li><Check size={17} /> Private download link delivered to the purchaser by email</li>
            </ul>
          </div>
          <figure className="sample-image-frame">
            <img src="/sample-report-page.png" alt="Sample page from a Slipstream SEO Local Visibility Report" />
            <figcaption>Sample report page using demonstration data</figcaption>
          </figure>
        </section>

        <section className="pricing-band">
          <div className="pricing-inner">
            <div>
              <p className="product-eyebrow">Simple pricing</p>
              <h2>Local Visibility Report</h2>
              <p>A complete, one-time assessment. No recurring software fee and no sales call required.</p>
            </div>
            <div className="price-block"><strong>{price}</strong><span>one report</span></div>
            <ul className="price-includes">
              <li><Check size={16} /> Local market and competitor analysis</li>
              <li><Check size={16} /> Website and authority findings</li>
              <li><Check size={16} /> Prioritized 90-day roadmap</li>
              <li><Check size={16} /> Branded PDF delivered by email</li>
            </ul>
            <ProductLink href="/get-report" className="primary-button price-button">
              Get My Local Visibility Report <ArrowRight size={18} />
            </ProductLink>
          </div>
        </section>
      </main>
      <footer className="public-footer">
        <Brand />
        <div className="footer-details">
          <p>{BUSINESS_IDENTITY}</p>
          <nav aria-label="Customer policies"><a href={`mailto:${supportEmail}`}>{supportEmail}</a><ProductLink href="/privacy">Privacy</ProductLink><ProductLink href="/refund-policy">Refund policy</ProductLink></nav>
        </div>
      </footer>
    </div>
  );
}

function Deliverable({ icon, number, title, text }: { icon: ReactNode; number: string; title: string; text: string }) {
  return (
    <article className="deliverable-item">
      <div className="deliverable-top"><span>{icon}</span><small>{number}</small></div>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function IntakePage() {
  const { priceCents, deliveryTimeframe, supportEmail } = useProductConfig();
  const price = formatPrice(priceCents);
  const [values, setValues] = useState<IntakeValues>(savedIntake);
  const [errors, setErrors] = useState<IntakeErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canceled = new URLSearchParams(window.location.search).get("canceled") === "1";

  useEffect(() => {
    sessionStorage.setItem(INTAKE_STORAGE_KEY, JSON.stringify(values));
  }, [values]);

  function focusFirstError(fieldErrors: IntakeErrors) {
    const first = (["businessName", "website", "address", "email", "notes"] as const).find((field) => fieldErrors[field]);
    if (first) window.requestAnimationFrame(() => document.getElementById(`intake-${first}`)?.focus());
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const normalized = normalizeIntake(values);
    const clientErrors = validateIntake(normalized);
    setValues(normalized);
    setErrors(clientErrors);
    setSubmitError("");
    if (Object.keys(clientErrors).length > 0) {
      focusFirstError(clientErrors);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(normalized),
      });
      const payload = await response.json() as { url?: string; error?: string; fields?: IntakeErrors };
      if (!response.ok || !payload.url) {
        if (payload.fields) {
          setErrors(payload.fields);
          focusFirstError(payload.fields);
        }
        throw new Error(payload.error ?? "Checkout could not be started.");
      }
      window.location.assign(payload.url);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Checkout could not be started.");
      setSubmitting(false);
    }
  }

  function update(field: keyof IntakeValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  return (
    <div className="public-site intake-page">
      <PublicHeader />
      <main className="intake-layout">
        <section className="intake-intro">
          <p className="product-eyebrow">Local Visibility Report</p>
          <h1>Tell us where to look.</h1>
          <p>We only need the basics to analyze your local market and prepare the report.</p>
          <div className="order-summary">
            <div><FileText size={21} /><span><strong>One professional PDF</strong><small>Market, competition, findings, and roadmap</small></span></div>
            <div><LockKeyhole size={21} /><span><strong>Private delivery</strong><small>{deliveryTimeframe}</small></span></div>
            <div><span className="summary-price">{price}</span><span><strong>One-time purchase</strong><small>No subscription or account</small></span></div>
          </div>
        </section>

        <form className="intake-form" onSubmit={submit} noValidate>
          {canceled && <div className="notice warning" role="status"><CircleAlert size={18} /> Checkout was canceled. Your card was not charged, and your details have been preserved.</div>}
          {Object.keys(errors).length > 0 && <div className="sr-only" role="alert" aria-live="assertive">Please correct the highlighted fields before continuing.</div>}
          <FormField id="intake-businessName" label="Business name" error={errors.businessName} required>
            <input id="intake-businessName" value={values.businessName} onChange={(event) => update("businessName", event.target.value)} autoComplete="organization" maxLength={120} required aria-describedby={errors.businessName ? "intake-businessName-error" : undefined} aria-invalid={Boolean(errors.businessName)} />
          </FormField>
          <FormField id="intake-website" label="Website" hint="Optional" error={errors.website}>
            <input id="intake-website" value={values.website} onChange={(event) => update("website", event.target.value)} autoComplete="url" inputMode="url" placeholder="yourpractice.com" aria-describedby={errors.website ? "intake-website-error" : undefined} aria-invalid={Boolean(errors.website)} />
          </FormField>
          <FormField id="intake-address" label="Business address" error={errors.address} required>
            <input id="intake-address" value={values.address} onChange={(event) => update("address", event.target.value)} autoComplete="street-address" placeholder="Street, city, state, ZIP" maxLength={240} required aria-describedby={errors.address ? "intake-address-error" : undefined} aria-invalid={Boolean(errors.address)} />
          </FormField>
          <FormField id="intake-email" label="Email" hint="Your report will be sent here" error={errors.email} required>
            <input id="intake-email" value={values.email} onChange={(event) => update("email", event.target.value)} autoComplete="email" inputMode="email" type="email" maxLength={254} required aria-describedby={errors.email ? "intake-email-error" : undefined} aria-invalid={Boolean(errors.email)} />
          </FormField>
          <FormField id="intake-notes" label="Notes" hint={`${values.notes.length}/1000 - optional`} error={errors.notes}>
            <textarea id="intake-notes" value={values.notes} onChange={(event) => update("notes", event.target.value)} rows={4} maxLength={1000} placeholder="Anything unusual about the location or market we should know?" aria-describedby={errors.notes ? "intake-notes-error" : undefined} aria-invalid={Boolean(errors.notes)} />
          </FormField>
          {submitError && <div className="notice error" role="alert"><CircleAlert size={18} /> {submitError}</div>}
          <button className="primary-button checkout-button" type="submit" disabled={submitting}>
            {submitting ? <><LoaderCircle className="spin" size={18} /> Opening secure checkout...</> : <>Continue to Secure Checkout <ArrowRight size={18} /></>}
          </button>
          <p className="form-fine-print"><ShieldCheck size={14} /> Payment is processed securely by Stripe. We do not store card details.</p>
          <p className="form-fine-print">Questions before ordering? <a href={`mailto:${supportEmail}`}>{supportEmail}</a></p>
        </form>
      </main>
    </div>
  );
}

function FormField({ id, label, hint, error, required, children }: { id: string; label: string; hint?: string; error?: string; required?: boolean; children: ReactNode }) {
  return (
    <div className={`form-field${error ? " has-error" : ""}`}>
      <span><label htmlFor={id}><strong>{label}{required && <i aria-hidden="true"> *</i>}</strong></label>{hint && <small>{hint}</small>}</span>
      {children}
      {error && <em id={`${id}-error`}>{error}</em>}
    </div>
  );
}

function ConfirmationPage() {
  const { supportEmail, deliveryTimeframe } = useProductConfig();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const id = params.get("request") ?? "";
  const access = params.get("access") ?? "";
  const sessionId = params.get("session_id") ?? "";
  const [report, setReport] = useState<PublicReportRequest | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id || !access) {
      setError("This confirmation link is incomplete.");
      return;
    }
    let active = true;
    let timer: number | undefined;
    let consecutiveFailures = 0;
    let paymentConfirmed = false;

    async function reconcile() {
      if (!sessionId) return;
      const response = await fetch(`/api/report-requests/${encodeURIComponent(id)}/reconcile?access=${encodeURIComponent(access)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (response.status === 409) return;
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Payment could not be verified.");
    }

    async function load() {
      try {
        if (sessionId && !paymentConfirmed) await reconcile();
        const response = await fetch(`/api/report-requests/${encodeURIComponent(id)}?access=${encodeURIComponent(access)}`);
        const payload = await response.json() as PublicReportRequest & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Report request not found.");
        if (!active) return;
        consecutiveFailures = 0;
        setError("");
        setReport(payload);
        paymentConfirmed = payload.stages.paymentConfirmed;
        if (payload.stages.paymentConfirmed) sessionStorage.removeItem(INTAKE_STORAGE_KEY);
        if (!["completed", "failed"].includes(payload.status)) timer = window.setTimeout(load, 4000);
      } catch (loadError) {
        if (!active) return;
        consecutiveFailures += 1;
        if (consecutiveFailures >= 3) setError(loadError instanceof Error ? loadError.message : "Unable to load report status.");
        timer = window.setTimeout(load, Math.min(12_000, 2000 * consecutiveFailures));
      }
    }
    void load();
    return () => { active = false; if (timer) window.clearTimeout(timer); };
  }, [id, access, sessionId]);

  return (
    <div className="public-site confirmation-page">
      <PublicHeader />
      <main className="confirmation-panel">
        {error ? (
          <><CircleAlert className="confirmation-icon failed" /><h1>We could not open this report request.</h1><p>{error}</p><ProductLink href="/" className="secondary-button">Return home</ProductLink></>
        ) : !report ? (
          <><LoaderCircle className="confirmation-icon spin" /><h1>Confirming your order...</h1><p>This should only take a moment.</p></>
        ) : report.status === "completed" ? (
          <><CheckCircle2 className="confirmation-icon ready" /><p className="product-eyebrow">Report ready</p><h1>{report.businessName}</h1><p>{report.message}</p><a className="primary-button" href={report.downloadUrl ?? "#"}><Download size={18} /> Download My Report</a>{!report.stages.emailDelivered && <p className="support-note">The download is available now while email delivery retries automatically.</p>}</>
        ) : report.status === "failed" ? (
          <><CircleAlert className="confirmation-icon failed" /><p className="product-eyebrow">Needs attention</p><h1>We hit a problem preparing your report.</h1><p>{report.message}</p><a className="secondary-button" href={`mailto:${supportEmail}`}>Contact support</a></>
        ) : (
          <><LoaderCircle className="confirmation-icon spin" /><p className="product-eyebrow">{report.stages.paymentConfirmed ? "Payment received" : "Confirming payment"}</p><h1>{report.stages.paymentConfirmed ? "We are preparing your report." : "Stripe is confirming your order."}</h1><p>{report.message}</p><div className="status-track four-stages"><span className={report.stages.paymentConfirmed ? "done" : "active"}>Payment</span><span className={report.stages.analysisComplete ? "done" : report.stages.paymentConfirmed ? "active" : ""}>Analyzed</span><span className={report.stages.pdfGenerated ? "done" : ""}>PDF ready</span><span className={report.stages.emailDelivered ? "done" : ""}>Emailed</span></div><p className="support-note">{deliveryTimeframe} You can leave this page; we will email the private download link.</p></>
        )}
      </main>
    </div>
  );
}

function AdminPage() {
  const [token, setToken] = useState(() => sessionStorage.getItem("slipstream-admin-token") ?? "");
  const [verified, setVerified] = useState(false);
  const [authError, setAuthError] = useState("");

  async function verify(candidate: string) {
    setAuthError("");
    const response = await fetch("/api/admin/reports", { headers: { "x-admin-token": candidate } });
    if (!response.ok) {
      setVerified(false);
      setAuthError("That admin token was not accepted.");
      return false;
    }
    sessionStorage.setItem("slipstream-admin-token", candidate);
    setToken(candidate);
    setVerified(true);
    return true;
  }

  useEffect(() => { if (token) void verify(token); }, []);

  if (!verified) return <AdminLogin token={token} setToken={setToken} error={authError} onSubmit={verify} />;
  return <AdminDashboard token={token} />;
}

function AdminLogin({ token, setToken, error, onSubmit }: { token: string; setToken: (value: string) => void; error: string; onSubmit: (value: string) => Promise<boolean> }) {
  const [loading, setLoading] = useState(false);
  return (
    <main className="admin-login">
      <Brand />
      <form onSubmit={async (event) => { event.preventDefault(); setLoading(true); await onSubmit(token); setLoading(false); }}>
        <LockKeyhole size={28} />
        <h1>Internal access</h1>
        <p>Enter the operator token to manage paid report requests and delivery recovery.</p>
        <label><span>Admin token</span><input type="password" value={token} onChange={(event) => setToken(event.target.value)} autoComplete="current-password" /></label>
        {error && <div className="notice error">{error}</div>}
        <button className="primary-button" disabled={loading || !token}>{loading ? "Checking..." : "Continue"}</button>
      </form>
    </main>
  );
}

function AdminDashboard({ token }: { token: string }) {
  const [reports, setReports] = useState<AdminReportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retrying, setRetrying] = useState("");

  async function load() {
    try {
      const response = await fetch("/api/admin/reports", { headers: { "x-admin-token": token } });
      const payload = await response.json() as { reports?: AdminReportRequest[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not load reports.");
      setReports(payload.reports ?? []);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load reports.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(load, 10000);
    return () => window.clearInterval(timer);
  }, [token]);

  async function retry(id: string, stage: "generation" | "email") {
    setRetrying(`${id}:${stage}`);
    try {
      const response = await fetch(`/api/admin/reports/${id}/retry-${stage}`, { method: "POST", headers: { "x-admin-token": token } });
      if (!response.ok) throw new Error(`Could not queue ${stage} retry.`);
      await load();
    } catch (regenError) {
      setError(regenError instanceof Error ? regenError.message : `Could not queue ${stage} retry.`);
    } finally {
      setRetrying("");
    }
  }

  const groups: Array<{ label: string; statuses: ReportRequestStatus[] }> = [
    { label: "New", statuses: ["awaiting_payment", "new"] },
    { label: "Processing", statuses: ["processing"] },
    { label: "Completed", statuses: ["completed"] },
    { label: "Failed", statuses: ["failed"] },
  ];

  return (
    <div className="admin-shell">
      <header className="admin-header"><Brand /><div><button className="icon-button" title="Refresh reports" onClick={load}><RefreshCw size={18} /></button></div></header>
      <main className="admin-content">
        <div className="admin-title"><div><p className="product-eyebrow">Internal operations</p><h1>Report requests</h1></div><p>{reports.length} total requests</p></div>
        {error && <div className="notice error"><CircleAlert size={18} /> {error}</div>}
        {loading ? <div className="admin-empty"><LoaderCircle className="spin" /> Loading report requests...</div> : reports.length === 0 ? <div className="admin-empty"><FileText /> No report requests yet.</div> : (
          <div className="admin-groups">
            {groups.map((group) => {
              const items = reports.filter((report) => group.statuses.includes(report.status));
              return (
                <section className="admin-group" key={group.label}>
                  <header><h2>{group.label}</h2><span>{items.length}</span></header>
                  {items.length === 0 ? <p className="empty-state">No {group.label.toLowerCase()} reports.</p> : items.map((report) => (
                    <article className="report-row" key={report.id}>
                      <div><strong>{report.businessName}</strong><span>{report.email}</span><small>{report.address}</small><small className="stage-summary">Payment {report.paymentStatus === "paid" ? "confirmed" : "pending"} / Analysis {report.analysisCompletedAt ? "done" : "pending"} / PDF {report.pdfGeneratedAt ? "done" : "pending"} / Email {report.emailDeliveredAt ? "delivered" : "pending"}</small></div>
                      <div className="report-meta"><StatusBadge status={report.status} /><time>{new Date(report.updatedAt).toLocaleString()}</time></div>
                      {report.errorMessage && <p className="row-error">{report.errorStage ? `${report.errorStage}: ` : ""}{report.errorMessage}</p>}
                      <div className="row-actions">
                        {(report.status === "failed" || report.status === "completed") && <button className="icon-button" title="Retry report generation" onClick={() => retry(report.id, "generation")} disabled={retrying === `${report.id}:generation`}>{retrying === `${report.id}:generation` ? <LoaderCircle className="spin" /> : <RefreshCw />}</button>}
                        {report.pdfGeneratedAt && !report.emailDeliveredAt && <button className="icon-button" title="Retry email delivery" onClick={() => retry(report.id, "email")} disabled={retrying === `${report.id}:email`}>{retrying === `${report.id}:email` ? <LoaderCircle className="spin" /> : <Mail />}</button>}
                      </div>
                    </article>
                  ))}
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: ReportRequestStatus }) {
  return <span className={`status-badge status-${status}`}>{status.replace("_", " ")}</span>;
}

function PolicyPage({ kind }: { kind: "privacy" | "refund" }) {
  const { supportEmail } = useProductConfig();
  const privacy = kind === "privacy";
  return (
    <div className="public-site policy-page">
      <PublicHeader />
      <main className="policy-content">
        <p className="product-eyebrow">Customer policy</p>
        <h1>{privacy ? "Privacy" : "Refund policy"}</h1>
        {privacy ? (
          <>
            <p>Slipstream SEO collects the business details and email address you provide to prepare, deliver, and support your Local Visibility Report. Stripe processes payment details; Slipstream SEO does not store card information.</p>
            <p>Report inputs, generated findings, and the private PDF are stored for fulfillment and customer support. Public business information may be requested from the submitted website and OpenStreetMap services. We do not sell customer information.</p>
            <p>Private report links should be treated like the report itself. To request access help or deletion of completed order data, email <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p>
          </>
        ) : (
          <>
            <p>If Slipstream SEO cannot produce a usable report for the submitted business, the purchaser may choose a corrected report or a full refund.</p>
            <p>Because each report is prepared for a specific business, completed reports are not refundable for change of mind. Material data or delivery problems reported within seven days will be corrected; if they cannot be corrected, the purchase will be refunded.</p>
            <p>For delivery or refund help, email <a href={`mailto:${supportEmail}`}>{supportEmail}</a> with the business name and purchaser email.</p>
          </>
        )}
        <p className="policy-identity">{BUSINESS_IDENTITY}</p>
      </main>
    </div>
  );
}

function NotFoundPage() {
  return <div className="public-site"><PublicHeader /><main className="confirmation-panel"><CircleAlert className="confirmation-icon" /><h1>Page not found</h1><p>The page you requested is not part of the public report experience.</p><ProductLink href="/" className="primary-button">Return home</ProductLink></main></div>;
}

export default function ProductApp() {
  const [path, setPath] = useState(window.location.pathname.replace(/\/+$/, "") || "/");
  const [productConfig, setProductConfig] = useState(defaultProductConfig);
  useEffect(() => {
    const update = () => setPath(window.location.pathname.replace(/\/+$/, "") || "/");
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/public-config")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Public configuration unavailable.")))
      .then((payload: PublicProductConfig) => { if (active) setProductConfig(payload); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  let page: ReactNode;
  if (path === "/") page = <LandingPage />;
  else if (path === "/get-report") page = <IntakePage />;
  else if (path === "/confirmation") page = <ConfirmationPage />;
  else if (path === "/admin") page = <AdminPage />;
  else if (path === "/privacy") page = <PolicyPage kind="privacy" />;
  else if (path === "/refund-policy") page = <PolicyPage kind="refund" />;
  else page = <NotFoundPage />;
  return <ProductConfigContext.Provider value={productConfig}>{page}</ProductConfigContext.Provider>;
}
