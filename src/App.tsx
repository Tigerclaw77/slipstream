import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  assignments as seedAssignments,
  authorityAssets,
  practices as seedPractices,
  territories,
  topicClusters,
} from "./data/seedData";
import { canAssignAsset } from "./lib/assignment";
import {
  getCompetitorCountsByRadius,
  getCompetitorsByDistance,
  recommendTerritory,
} from "./lib/territory";
import {
  discoverRealCompetitors,
  type ProspectCoordinates,
  type RealCompetitor,
} from "./lib/realDiscovery";
import type { Assignment, AuthorityAsset, Practice } from "./types";

type RouteKey = "report" | "sources" | "practices" | "territory" | "assets" | "assignments";

type ReportRadius = 1 | 3 | 5;

type ReportCompetitorStatus = "protected" | "review" | "outside";

type ReportAvailability = "open" | "review" | "competitive";

type ReportCompetitorView = RealCompetitor & {
  status: ReportCompetitorStatus;
  xMiles: number;
  yMiles: number;
};

type AnalysisStatus = "idle" | "running" | "success" | "failed";

type ReportAnalysisState = {
  status: AnalysisStatus;
  prospectCoordinates?: ProspectCoordinates;
  competitors: RealCompetitor[];
  dataSource: string;
  error?: string;
};

type SourceProviderResult = {
  provider: string;
  status: "success" | "failed" | "missing_key";
  dataSource: string;
  error?: string;
  results: {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    distanceMiles: number;
    rating?: number;
    reviewCount?: number;
    website?: string;
  }[];
};

type SourceComparisonResponse = {
  address: string;
  center: {
    latitude: number;
    longitude: number;
  };
  radiusMiles: number;
  providers: SourceProviderResult[];
  comparison: {
    overlaps: {
      name: string;
      providers: string[];
    }[];
    missingByProvider: {
      provider: string;
      missing: string[];
    }[];
  };
};

type ReportMetricSet = {
  protectedRadius: ReportRadius;
  reviewZoneRadius: number;
  competitorsBlocked: number;
  reviewZoneCount: number;
  availability: ReportAvailability;
  scores: { label: string; score: number }[];
};

type ReportPracticeInput = {
  name: string;
  address: string;
};

type PracticeForm = {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: string;
  longitude: string;
  website: string;
  practice_type: string;
  status: Practice["status"];
  tier: string;
};

const routes: { key: RouteKey; label: string }[] = [
  { key: "report", label: "Prospect Report" },
  { key: "sources", label: "Source Comparison" },
  { key: "practices", label: "Practices" },
  { key: "territory", label: "Territory Explorer" },
  { key: "assets", label: "Authority Assets" },
  { key: "assignments", label: "Assignments" },
];

const initialForm: PracticeForm = {
  name: "",
  address: "",
  city: "Katy",
  state: "TX",
  zip: "",
  latitude: "29.7437",
  longitude: "-95.7762",
  website: "",
  practice_type: "Optometry",
  status: "prospect",
  tier: "Prospect",
};

const initialReportForm: ReportPracticeInput = {
  name: "Cinco Ranch Vision Studio",
  address: "23501 Cinco Ranch Blvd, Katy, TX 77494",
};

const reportRadiusOptions: ReportRadius[] = [1, 3, 5];

const initialReportAnalysis: ReportAnalysisState = {
  status: "idle",
  competitors: [],
  dataSource: "Not run",
};

function routeFromHash(): RouteKey {
  const hash = window.location.hash.replace("#/", "");
  return routes.some((route) => route.key === hash) ? (hash as RouteKey) : "report";
}

function statusLabel(status: string) {
  return status.replace("-", " ");
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreLabel(score: number) {
  if (score >= 80) {
    return "Strong";
  }

  if (score >= 60) {
    return "Promising";
  }

  if (score >= 40) {
    return "Needs Review";
  }

  return "Constrained";
}

function reportStatusLabel(status: ReportCompetitorStatus) {
  if (status === "protected") {
    return "Protected / blocked";
  }

  if (status === "review") {
    return "Review Zone";
  }

  return "Outside territory";
}

function reportAvailabilityLabel(availability: ReportAvailability) {
  if (availability === "competitive") {
    return "Competitive";
  }

  if (availability === "review") {
    return "Review";
  }

  return "Open";
}

function getReportCompetitorStatus(
  distanceMiles: number,
  protectedRadius: ReportRadius,
): ReportCompetitorStatus {
  if (distanceMiles <= protectedRadius) {
    return "protected";
  }

  if (distanceMiles <= protectedRadius + 2) {
    return "review";
  }

  return "outside";
}

function projectMiles(
  prospect: Pick<Practice, "latitude" | "longitude">,
  location: Pick<RealCompetitor, "latitude" | "longitude">,
) {
  const milesPerLatitudeDegree = 69;
  const milesPerLongitudeDegree =
    Math.cos((prospect.latitude * Math.PI) / 180) * milesPerLatitudeDegree;

  return {
    xMiles: (location.longitude - prospect.longitude) * milesPerLongitudeDegree,
    yMiles: (prospect.latitude - location.latitude) * milesPerLatitudeDegree,
  };
}

function getReportAvailability(
  competitorsBlocked: number,
  reviewZoneCount: number,
  protectedRadius: ReportRadius,
): ReportAvailability {
  if (competitorsBlocked >= protectedRadius * 2 + 3) {
    return "competitive";
  }

  if (competitorsBlocked >= protectedRadius + 2 || reviewZoneCount >= 4) {
    return "review";
  }

  return "open";
}

function getReportMetrics(
  competitors: ReportCompetitorView[],
  protectedRadius: ReportRadius,
): ReportMetricSet {
  const competitorsBlocked = competitors.filter(
    (competitor) => competitor.status === "protected",
  ).length;
  const reviewZoneCount = competitors.filter((competitor) => competitor.status === "review").length;
  const availability = getReportAvailability(
    competitorsBlocked,
    reviewZoneCount,
    protectedRadius,
  );
  const availabilityBase = availability === "open" ? 90 : availability === "review" ? 70 : 52;
  const territoryStrength = clampScore(
    availabilityBase + protectedRadius * 3 - competitorsBlocked * 4 - reviewZoneCount * 2,
  );
  const competitionDensity = clampScore(100 - competitorsBlocked * 9 - reviewZoneCount * 5);
  const searchAuthority = clampScore(78 + protectedRadius * 2 - reviewZoneCount);
  const overallOpportunity = clampScore(
    territoryStrength * 0.38 + competitionDensity * 0.28 + searchAuthority * 0.34,
  );

  return {
    protectedRadius,
    reviewZoneRadius: protectedRadius + 2,
    competitorsBlocked,
    reviewZoneCount,
    availability,
    scores: [
      { label: "Territory Strength", score: territoryStrength },
      { label: "Competition Density", score: competitionDensity },
      { label: "Search Authority", score: searchAuthority },
      { label: "Overall Opportunity", score: overallOpportunity },
    ],
  };
}

function App() {
  const [route, setRoute] = useState<RouteKey>(routeFromHash);
  const [practices, setPractices] = useState<Practice[]>(seedPractices);
  const [selectedPracticeId, setSelectedPracticeId] = useState("practice-prospect-1");
  const [form, setForm] = useState<PracticeForm>(initialForm);
  const [reportForm, setReportForm] = useState(initialReportForm);
  const [reportAnalysis, setReportAnalysis] =
    useState<ReportAnalysisState>(initialReportAnalysis);
  const [selectedReportRadius, setSelectedReportRadius] = useState<ReportRadius>(3);
  const [selectedAssetId, setSelectedAssetId] = useState("asset-dry-eye-katy");
  const [sourceAddress, setSourceAddress] = useState(initialReportForm.address);
  const [sourceRadius, setSourceRadius] = useState<ReportRadius>(3);
  const [sourceStatus, setSourceStatus] = useState<AnalysisStatus>("idle");
  const [sourceComparison, setSourceComparison] = useState<SourceComparisonResponse | undefined>();
  const [sourceError, setSourceError] = useState<string | undefined>();

  useEffect(() => {
    const handleHashChange = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", handleHashChange);
    if (!window.location.hash) {
      window.location.hash = "/report";
    }

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const selectedPractice =
    practices.find((practice) => practice.id === selectedPracticeId) ?? practices[0];
  const selectedAsset =
    authorityAssets.find((asset) => asset.id === selectedAssetId) ?? authorityAssets[0];

  const competitorCounts = useMemo(
    () => getCompetitorCountsByRadius(selectedPractice, practices),
    [selectedPractice, practices],
  );

  const competitors = useMemo(
    () => getCompetitorsByDistance(selectedPractice, practices).filter((item) => item.distanceMiles <= 10),
    [selectedPractice, practices],
  );

  const recommendation = useMemo(
    () => recommendTerritory(selectedPractice, practices),
    [selectedPractice, practices],
  );

  const assignmentDecision = useMemo(
    () =>
      canAssignAsset(selectedPractice, selectedAsset, {
        practices,
        territories,
        assignments: seedAssignments,
      }),
    [practices, selectedAsset, selectedPractice],
  );

  const reportPractice = useMemo<Practice>(
    () => {
      const latitude = reportAnalysis.prospectCoordinates?.latitude ?? 0;
      const longitude = reportAnalysis.prospectCoordinates?.longitude ?? 0;

      return {
        id: "practice-report-prospect",
        name: reportForm.name.trim() || "Prospect Practice",
        address: reportForm.address.trim(),
        city: "",
        state: "",
        zip: "",
        latitude,
        longitude,
        website: "",
        practice_type: "Optometry",
        status: "prospect",
        tier: "Prospect",
      };
    },
    [reportAnalysis.prospectCoordinates, reportForm],
  );

  const reportCompetitors = useMemo<ReportCompetitorView[]>(
    () =>
      reportAnalysis.competitors
        .map((competitor) => {
          const projectedLocation = projectMiles(reportPractice, competitor);

          return {
            ...competitor,
            ...projectedLocation,
            status: getReportCompetitorStatus(competitor.distanceMiles, selectedReportRadius),
          };
        })
        .sort((a, b) => a.distanceMiles - b.distanceMiles),
    [reportAnalysis.competitors, reportPractice, selectedReportRadius],
  );

  const reportMetrics = useMemo(
    () => getReportMetrics(reportCompetitors, selectedReportRadius),
    [reportCompetitors, selectedReportRadius],
  );

  function addPractice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);

    if (!form.name.trim() || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return;
    }

    const newPractice: Practice = {
      id: `practice-local-${Date.now()}`,
      name: form.name.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      zip: form.zip.trim(),
      latitude,
      longitude,
      website: form.website.trim(),
      practice_type: form.practice_type.trim() || "Optometry",
      status: form.status,
      tier: form.tier.trim() || "Prospect",
    };

    setPractices((current) => [newPractice, ...current]);
    setSelectedPracticeId(newPractice.id);
    setForm(initialForm);
  }

  function updateReportForm(nextForm: ReportPracticeInput) {
    setReportForm(nextForm);
    setReportAnalysis(initialReportAnalysis);
  }

  async function runReportAnalysis() {
    setReportAnalysis({
      status: "running",
      competitors: [],
      dataSource: "OpenStreetMap Nominatim geocoding + real competitor discovery",
    });

    try {
      const result = await discoverRealCompetitors(reportForm.name, reportForm.address);

      setReportAnalysis({
        status: "success",
        prospectCoordinates: result.prospectCoordinates,
        competitors: result.competitors,
        dataSource: result.dataSource,
      });
    } catch (error) {
      setReportAnalysis({
        status: "failed",
        competitors: [],
        dataSource: "OpenStreetMap Nominatim geocoding + real competitor discovery",
        error: error instanceof Error ? error.message : "Analysis failed.",
      });
    }
  }

  async function runSourceComparison() {
    setSourceStatus("running");
    setSourceComparison(undefined);
    setSourceError(undefined);

    try {
      const searchParams = new URLSearchParams({
        address: sourceAddress,
        radiusMiles: String(sourceRadius),
      });
      const response = await fetch(`/api/source-comparison?${searchParams}`);

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => undefined)) as
          | { error?: string }
          | undefined;
        throw new Error(errorPayload?.error ?? `Source comparison failed with status ${response.status}.`);
      }

      setSourceComparison((await response.json()) as SourceComparisonResponse);
      setSourceStatus("success");
    } catch (error) {
      setSourceError(error instanceof Error ? error.message : "Source comparison failed.");
      setSourceStatus("failed");
    }
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Internal Prototype</p>
          <h1>Slipstream</h1>
        </div>

        <nav className="nav" aria-label="Primary navigation">
          {routes.map((item) => (
            <a
              className={route === item.key ? "nav-link active" : "nav-link"}
              href={`#/${item.key}`}
              key={item.key}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      <main className="content">
        {route === "report" && (
          <ProspectReportView
            competitors={reportCompetitors}
            diagnostics={reportAnalysis}
            form={reportForm}
            metrics={reportMetrics}
            onRunAnalysis={runReportAnalysis}
            practice={reportPractice}
            selectedRadius={selectedReportRadius}
            setForm={updateReportForm}
            setSelectedRadius={setSelectedReportRadius}
          />
        )}
        {route === "sources" && (
          <SourceComparisonView
            address={sourceAddress}
            comparison={sourceComparison}
            error={sourceError}
            onRunComparison={runSourceComparison}
            radius={sourceRadius}
            setAddress={setSourceAddress}
            setRadius={setSourceRadius}
            status={sourceStatus}
          />
        )}
        {route === "practices" && <PracticesView practices={practices} />}
        {route === "territory" && (
          <TerritoryExplorer
            addPractice={addPractice}
            assignmentDecision={assignmentDecision}
            competitorCounts={competitorCounts}
            competitors={competitors}
            form={form}
            practices={practices}
            recommendation={recommendation}
            selectedAsset={selectedAsset}
            selectedAssetId={selectedAssetId}
            selectedPractice={selectedPractice}
            selectedPracticeId={selectedPracticeId}
            setForm={setForm}
            setSelectedAssetId={setSelectedAssetId}
            setSelectedPracticeId={setSelectedPracticeId}
          />
        )}
        {route === "assets" && <AssetsView />}
        {route === "assignments" && (
          <AssignmentsView assignments={seedAssignments} practices={practices} />
        )}
      </main>
    </div>
  );
}

type TerritoryExplorerProps = {
  addPractice: (event: FormEvent<HTMLFormElement>) => void;
  assignmentDecision: ReturnType<typeof canAssignAsset>;
  competitorCounts: ReturnType<typeof getCompetitorCountsByRadius>;
  competitors: ReturnType<typeof getCompetitorsByDistance>;
  form: PracticeForm;
  practices: Practice[];
  recommendation: ReturnType<typeof recommendTerritory>;
  selectedAsset: AuthorityAsset;
  selectedAssetId: string;
  selectedPractice: Practice;
  selectedPracticeId: string;
  setForm: (form: PracticeForm) => void;
  setSelectedAssetId: (id: string) => void;
  setSelectedPracticeId: (id: string) => void;
};

function TerritoryExplorer({
  addPractice,
  assignmentDecision,
  competitorCounts,
  competitors,
  form,
  practices,
  recommendation,
  selectedAsset,
  selectedAssetId,
  selectedPractice,
  selectedPracticeId,
  setForm,
  setSelectedAssetId,
  setSelectedPracticeId,
}: TerritoryExplorerProps) {
  return (
    <section className="view">
      <div className="view-header">
        <div>
          <p className="eyebrow">Slipstream Territory</p>
          <h2>Territory Explorer</h2>
        </div>
        <label className="select-control">
          <span>Practice</span>
          <select
            value={selectedPracticeId}
            onChange={(event) => setSelectedPracticeId(event.target.value)}
          >
            {practices.map((practice) => (
              <option value={practice.id} key={practice.id}>
                {practice.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="territory-grid">
        <form className="panel form-panel" onSubmit={addPractice}>
          <div className="panel-heading">
            <h3>Add Practice</h3>
            <span className="pill">{form.status}</span>
          </div>

          <div className="field-grid">
            <label>
              <span>Name</span>
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </label>
            <label>
              <span>Website</span>
              <input
                value={form.website}
                onChange={(event) => setForm({ ...form, website: event.target.value })}
              />
            </label>
            <label className="wide">
              <span>Address</span>
              <input
                value={form.address}
                onChange={(event) => setForm({ ...form, address: event.target.value })}
              />
            </label>
            <label>
              <span>City</span>
              <input
                value={form.city}
                onChange={(event) => setForm({ ...form, city: event.target.value })}
              />
            </label>
            <label>
              <span>State</span>
              <input
                value={form.state}
                onChange={(event) => setForm({ ...form, state: event.target.value })}
              />
            </label>
            <label>
              <span>Zip</span>
              <input
                value={form.zip}
                onChange={(event) => setForm({ ...form, zip: event.target.value })}
              />
            </label>
            <label>
              <span>Lat</span>
              <input
                value={form.latitude}
                onChange={(event) => setForm({ ...form, latitude: event.target.value })}
                required
              />
            </label>
            <label>
              <span>Lng</span>
              <input
                value={form.longitude}
                onChange={(event) => setForm({ ...form, longitude: event.target.value })}
                required
              />
            </label>
            <label>
              <span>Type</span>
              <input
                value={form.practice_type}
                onChange={(event) => setForm({ ...form, practice_type: event.target.value })}
              />
            </label>
            <label>
              <span>Status</span>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm({ ...form, status: event.target.value as Practice["status"] })
                }
              >
                <option value="prospect">prospect</option>
                <option value="client">client</option>
                <option value="competitor">competitor</option>
                <option value="blocked">blocked</option>
              </select>
            </label>
            <label>
              <span>Tier</span>
              <input
                value={form.tier}
                onChange={(event) => setForm({ ...form, tier: event.target.value })}
              />
            </label>
          </div>

          <button className="primary-button" type="submit">
            Add Practice
          </button>
        </form>

        <section className="panel recommendation-panel">
          <div className="panel-heading">
            <h3>{selectedPractice.name}</h3>
            <span className={`availability ${recommendation.availability}`}>
              {recommendation.availability}
            </span>
          </div>

          <div className="metric-grid">
            <Metric label="Protected Radius" value={`${recommendation.suggestedProtectedRadius} mi`} />
            <Metric label="Competitors Blocked" value={String(recommendation.competitorsBlocked)} />
            <Metric label="Review Zone" value={`${recommendation.reviewZoneRadius} mi`} />
            <Metric label="Territory Availability" value={recommendation.availability} />
          </div>

          <div className="detail-row">
            <span>Coordinates</span>
            <strong>
              {selectedPractice.latitude.toFixed(4)}, {selectedPractice.longitude.toFixed(4)}
            </strong>
          </div>
          <div className="detail-row">
            <span>Nearest client</span>
            <strong>
              {recommendation.nearestClient
                ? `${recommendation.nearestClient.practice.name} (${recommendation.nearestClient.distanceMiles.toFixed(1)} mi)`
                : "None"}
            </strong>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <h3>Competitor Counts</h3>
          <span className="muted">Preset radii</span>
        </div>
        <div className="radius-grid">
          {competitorCounts.map((item) => (
            <Metric key={item.radius} label={`${item.radius} mi`} value={String(item.count)} />
          ))}
        </div>
      </section>

      <div className="territory-grid lower-grid">
        <section className="panel">
          <div className="panel-heading">
            <h3>Nearby Competitors</h3>
            <span className="muted">Within 10 miles</span>
          </div>
          <DataTable
            columns={["Practice", "City", "Distance"]}
            rows={competitors.map((item) => [
              item.practice.name,
              item.practice.city,
              `${item.distanceMiles.toFixed(2)} mi`,
            ])}
          />
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h3>Assignment Status</h3>
            <span className={`availability ${assignmentDecision.status}`}>
              {assignmentDecision.status}
            </span>
          </div>

          <label className="select-control full">
            <span>Authority Asset</span>
            <select
              value={selectedAssetId}
              onChange={(event) => setSelectedAssetId(event.target.value)}
            >
              {authorityAssets.map((asset) => (
                <option value={asset.id} key={asset.id}>
                  {asset.title}
                </option>
              ))}
            </select>
          </label>

          <div className="asset-summary">
            <strong>{selectedAsset.title}</strong>
            <span>{selectedAsset.intent}</span>
          </div>
          <p className="decision-copy">{assignmentDecision.reason}</p>
          {assignmentDecision.nearestConflict && (
            <div className="conflict-box">
              <span>{assignmentDecision.nearestConflict.practice.name}</span>
              <strong>{assignmentDecision.nearestConflict.distanceMiles.toFixed(2)} mi away</strong>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function ProspectReportView({
  competitors,
  diagnostics,
  form,
  metrics,
  onRunAnalysis,
  practice,
  selectedRadius,
  setForm,
  setSelectedRadius,
}: {
  competitors: ReportCompetitorView[];
  diagnostics: ReportAnalysisState;
  form: typeof initialReportForm;
  metrics: ReportMetricSet;
  onRunAnalysis: () => Promise<void>;
  practice: Practice;
  selectedRadius: ReportRadius;
  setForm: (form: typeof initialReportForm) => void;
  setSelectedRadius: (radius: ReportRadius) => void;
}) {
  const protectedCompetitors = competitors.filter((competitor) => competitor.status === "protected");
  const hasCoordinates = Boolean(diagnostics.prospectCoordinates);
  const canRunAnalysis = Boolean(form.address.trim()) && diagnostics.status !== "running";
  const availabilityNote =
    diagnostics.status === "idle"
      ? "Enter a practice address and run analysis to generate real territory intelligence."
      : diagnostics.status === "failed"
        ? "Analysis failed. No competitors are shown because no verified competitor data was returned."
        : metrics.availability === "open"
          ? "The selected Protected Radius creates a clean Territory Protection story with manageable competitive overlap."
          : metrics.availability === "review"
            ? "The selected radius has meaningful competitive overlap. This is a useful sales-call discussion for Local Visibility and Market Position."
            : "The selected radius is dense. A tighter territory or staged Search Authority plan may create the strongest offer.";

  return (
    <section className="view report-view">
      <div className="view-header report-controls">
        <div>
          <p className="eyebrow">Sales Call Report</p>
          <h2>Prospect Report</h2>
        </div>
        <button className="secondary-button" type="button" onClick={() => window.print()}>
          Print / Save PDF
        </button>
      </div>

      <div className="report-workspace">
        <form className="panel report-controls report-inputs">
          <div className="panel-heading">
            <h3>Prospect Inputs</h3>
            <span className="muted">Manual entry</span>
          </div>
          <div className="field-grid compact">
            <label className="wide">
              <span>Practice Name</span>
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </label>
            <label className="wide">
              <span>Address</span>
              <input
                value={form.address}
                onChange={(event) => setForm({ ...form, address: event.target.value })}
              />
            </label>
            <label className="wide">
              <span>Protected Radius</span>
              <select
                value={selectedRadius}
                onChange={(event) => setSelectedRadius(Number(event.target.value) as ReportRadius)}
              >
                {reportRadiusOptions.map((radius) => (
                  <option value={radius} key={radius}>
                    {radius} mile{radius === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            className="primary-button"
            disabled={!canRunAnalysis}
            type="button"
            onClick={() => void onRunAnalysis()}
          >
            {diagnostics.status === "running" ? "Running Analysis..." : "Run Analysis"}
          </button>
          <DiagnosticsPanel diagnostics={diagnostics} />
        </form>

        <article className="prospect-report" aria-label="Printable prospect report">
          <header className="report-hero">
            <div>
              <p className="report-kicker">Slipstream Territory Recommendation</p>
              <h2>{practice.name}</h2>
              <p>{practice.address || "Address not entered"}</p>
            </div>
            <div className={`report-status ${metrics.availability}`}>
              <span>Territory Availability</span>
              <strong>{reportAvailabilityLabel(metrics.availability)}</strong>
            </div>
          </header>

          <section className="report-summary">
            <div>
              <span>Territory Recommendation</span>
              <strong>{availabilityNote}</strong>
            </div>
            <div>
              <span>Market Position</span>
              <strong>
                {hasCoordinates
                  ? `${metrics.protectedRadius} mi Protected Radius / ${metrics.reviewZoneRadius} mi Review Zone`
                  : "Run analysis to geocode the prospect address"}
              </strong>
            </div>
          </section>

          <section className="report-metrics" aria-label="Territory metrics">
            <Metric label="Protected Radius" value={`${metrics.protectedRadius} mi`} />
            <Metric label="Review Zone" value={`${metrics.reviewZoneRadius} mi`} />
            <Metric label="Competitors Blocked" value={String(metrics.competitorsBlocked)} />
            <Metric label="Review Zone Count" value={String(metrics.reviewZoneCount)} />
            <Metric label="Territory Availability" value={reportAvailabilityLabel(metrics.availability)} />
          </section>

          <section className="report-territory-grid">
            <div className="report-map-panel">
              <div className="report-section-heading">
                <h3>Territory Protection Map</h3>
                <span>Local Visibility view</span>
              </div>
              <ReportMap
                competitors={competitors}
                hasCoordinates={hasCoordinates}
                metrics={metrics}
                practice={practice}
              />
            </div>

            <div className="report-competitor-panel">
              <div className="report-section-heading">
                <h3>Competitors Affected</h3>
                <span>Selected radius</span>
              </div>
              <div className="competitor-list">
                {competitors.length > 0 ? (
                  competitors.map((competitor) => (
                  <div className={`competitor-card ${competitor.status}`} key={competitor.id}>
                    <div>
                      <strong>{competitor.name}</strong>
                      <span>{competitor.address}</span>
                      {competitor.website && (
                        <a href={competitor.website} rel="noreferrer" target="_blank">
                          {competitor.website}
                        </a>
                      )}
                    </div>
                    <div className="competitor-card-meta">
                      <span>{competitor.distanceMiles.toFixed(2)} mi</span>
                      <em>{reportStatusLabel(competitor.status)}</em>
                    </div>
                  </div>
                  ))
                ) : (
                  <div className="empty-competitors">
                    {diagnostics.status === "failed"
                      ? "Discovery failed. No competitors loaded."
                      : diagnostics.status === "success"
                        ? "No optometry-related competitors were found in the discovery radius."
                        : "Run analysis to discover real competitors."}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="scorecard" aria-label="Visual scorecard">
            <div className="report-section-heading">
              <h3>Modern Search Readiness</h3>
              <span>Sales-call scorecard</span>
            </div>
            <div className="score-list">
              {metrics.scores.map((score) => (
                <div className="score-row" key={score.label}>
                  <div className="score-meta">
                    <span>{score.label}</span>
                    <strong>
                      {score.score} / 100 <em>{scoreLabel(score.score)}</em>
                    </strong>
                  </div>
                  <div className="score-track" aria-hidden="true">
                    <span style={{ width: `${score.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="report-note-strip">
            <strong>Sales-call framing</strong>
            <span>
              This is a territory allocation view: {protectedCompetitors.length} competitor
              {protectedCompetitors.length === 1 ? "" : "s"} fall inside the selected Protected
              Radius, while the Review Zone shows nearby overlap to discuss before assigning Search
              Authority.
            </span>
          </section>
        </article>
      </div>
    </section>
  );
}

function DiagnosticsPanel({ diagnostics }: { diagnostics: ReportAnalysisState }) {
  const coordinates = diagnostics.prospectCoordinates
    ? `${diagnostics.prospectCoordinates.latitude.toFixed(4)}, ${diagnostics.prospectCoordinates.longitude.toFixed(4)}`
    : "-";

  return (
    <section className={`diagnostics-panel ${diagnostics.status}`}>
      <div className="diagnostics-row">
        <span>Prospect Coordinates</span>
        <strong>{coordinates}</strong>
      </div>
      <div className="diagnostics-row">
        <span>Competitors Found</span>
        <strong>{diagnostics.competitors.length}</strong>
      </div>
      <div className="diagnostics-row">
        <span>Data Source</span>
        <strong>{diagnostics.dataSource}</strong>
      </div>
      <div className="diagnostics-row">
        <span>Analysis Status</span>
        <strong>{diagnostics.status}</strong>
      </div>
      {diagnostics.error && <p className="diagnostics-error">{diagnostics.error}</p>}
    </section>
  );
}

function ReportMap({
  competitors,
  hasCoordinates,
  metrics,
  practice,
}: {
  competitors: ReportCompetitorView[];
  hasCoordinates: boolean;
  metrics: ReportMetricSet;
  practice: Practice;
}) {
  if (!hasCoordinates) {
    return (
      <div className="territory-map-empty">
        Run analysis to geocode the prospect and draw the territory map.
      </div>
    );
  }

  const farthestPoint = Math.max(
    metrics.reviewZoneRadius + 0.75,
    ...competitors.map((competitor) => Math.hypot(competitor.xMiles, competitor.yMiles) + 0.75),
  );
  const viewRadius = Math.ceil(farthestPoint);
  const markerRadius = Math.max(0.12, viewRadius * 0.02);
  const strokeWidth = Math.max(0.04, viewRadius * 0.006);

  return (
    <div className="territory-map-wrap">
      <svg
        aria-label="Prospect territory map"
        className="territory-map"
        role="img"
        viewBox={`${-viewRadius} ${-viewRadius} ${viewRadius * 2} ${viewRadius * 2}`}
      >
        <rect
          className="map-ground"
          x={-viewRadius}
          y={-viewRadius}
          width={viewRadius * 2}
          height={viewRadius * 2}
        />
        <circle
          className="map-review-zone"
          cx="0"
          cy="0"
          r={metrics.reviewZoneRadius}
          strokeWidth={strokeWidth}
        />
        <circle
          className="map-protected-radius"
          cx="0"
          cy="0"
          r={metrics.protectedRadius}
          strokeWidth={strokeWidth * 1.25}
        />
        {competitors.map((competitor) => (
          <circle
            className={`map-competitor-marker ${competitor.status}`}
            cx={competitor.xMiles}
            cy={competitor.yMiles}
            key={competitor.id}
            r={markerRadius}
          >
            <title>
              {competitor.name}: {competitor.distanceMiles.toFixed(2)} mi,{" "}
              {reportStatusLabel(competitor.status)}
            </title>
          </circle>
        ))}
        <g className="map-prospect-marker">
          <circle cx="0" cy="0" r={markerRadius * 1.9} />
          <circle cx="0" cy="0" r={markerRadius * 0.7} />
          <title>{practice.name}</title>
        </g>
      </svg>
      <div className="map-legend">
        <span className="prospect">Prospect</span>
        <span className="protected">Protected / blocked</span>
        <span className="review">Review Zone</span>
        <span className="outside">Outside territory</span>
      </div>
    </div>
  );
}

function SourceComparisonView({
  address,
  comparison,
  error,
  onRunComparison,
  radius,
  setAddress,
  setRadius,
  status,
}: {
  address: string;
  comparison?: SourceComparisonResponse;
  error?: string;
  onRunComparison: () => Promise<void>;
  radius: ReportRadius;
  setAddress: (address: string) => void;
  setRadius: (radius: ReportRadius) => void;
  status: AnalysisStatus;
}) {
  const allProviderNames = comparison?.providers.map((provider) => provider.provider) ?? [
    "OSM",
    "Google",
    "Yelp",
    "Foursquare",
    "Bing/Azure Maps",
  ];

  return (
    <section className="view source-view">
      <div className="view-header">
        <div>
          <p className="eyebrow">Competitor Accuracy</p>
          <h2>Source Comparison</h2>
        </div>
      </div>

      <section className="panel source-controls">
        <label>
          <span>Address</span>
          <input value={address} onChange={(event) => setAddress(event.target.value)} />
        </label>
        <label>
          <span>Radius</span>
          <select
            value={radius}
            onChange={(event) => setRadius(Number(event.target.value) as ReportRadius)}
          >
            {reportRadiusOptions.map((radiusOption) => (
              <option value={radiusOption} key={radiusOption}>
                {radiusOption} mile{radiusOption === 1 ? "" : "s"}
              </option>
            ))}
          </select>
        </label>
        <button
          className="primary-button"
          disabled={!address.trim() || status === "running"}
          type="button"
          onClick={() => void onRunComparison()}
        >
          {status === "running" ? "Comparing Sources..." : "Run Source Comparison"}
        </button>
      </section>

      {error && <div className="source-error">{error}</div>}

      {comparison && (
        <section className="panel source-diagnostics">
          <div className="diagnostics-row">
            <span>Prospect Coordinates</span>
            <strong>
              {comparison.center.latitude.toFixed(4)}, {comparison.center.longitude.toFixed(4)}
            </strong>
          </div>
          <div className="diagnostics-row">
            <span>Radius</span>
            <strong>{comparison.radiusMiles} mi</strong>
          </div>
          <div className="diagnostics-row">
            <span>Sources Compared</span>
            <strong>{comparison.providers.length}</strong>
          </div>
        </section>
      )}

      <section className="source-grid">
        {(comparison?.providers ?? []).map((provider) => (
          <ProviderCard provider={provider} key={provider.provider} />
        ))}
        {!comparison &&
          allProviderNames.map((providerName) => (
            <section className="panel provider-card pending" key={providerName}>
              <div className="provider-card-header">
                <h3>{providerName}</h3>
                <span>Not run</span>
              </div>
              <p className="provider-empty">Run comparison to load this source.</p>
            </section>
          ))}
      </section>

      {comparison && (
        <section className="source-insights-grid">
          <div className="panel">
            <div className="panel-heading">
              <h3>Overlaps</h3>
              <span className="muted">Same normalized name across sources</span>
            </div>
            <div className="overlap-list">
              {comparison.comparison.overlaps.length > 0 ? (
                comparison.comparison.overlaps.map((overlap) => (
                  <div className="overlap-row" key={overlap.name}>
                    <strong>{overlap.name}</strong>
                    <span>{overlap.providers.join(", ")}</span>
                  </div>
                ))
              ) : (
                <p className="provider-empty">No overlaps found yet.</p>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <h3>Missing Businesses</h3>
              <span className="muted">Union minus each source</span>
            </div>
            <div className="missing-list">
              {comparison.comparison.missingByProvider.map((provider) => (
                <div className="missing-group" key={provider.provider}>
                  <strong>{provider.provider}</strong>
                  <span>
                    {provider.missing.length > 0
                      ? provider.missing.slice(0, 12).join(", ")
                      : "No missing businesses against current union."}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </section>
  );
}

function ProviderCard({ provider }: { provider: SourceProviderResult }) {
  return (
    <section className={`panel provider-card ${provider.status}`}>
      <div className="provider-card-header">
        <div>
          <h3>{provider.provider}</h3>
          <span>{provider.dataSource}</span>
        </div>
        <strong>{provider.results.length}</strong>
      </div>
      {provider.error && <p className="provider-error">{provider.error}</p>}
      <div className="provider-results">
        {provider.results.length > 0 ? (
          provider.results.map((result) => (
            <div className="provider-result" key={result.id}>
              <strong>{result.name}</strong>
              <span>{result.distanceMiles.toFixed(2)} mi</span>
              <p>{result.address || "Address unavailable"}</p>
              {(result.rating || result.reviewCount || result.website) && (
                <em>
                  {result.rating ? `${result.rating} rating` : ""}
                  {result.rating && result.reviewCount ? " / " : ""}
                  {result.reviewCount ? `${result.reviewCount} reviews` : ""}
                  {(result.rating || result.reviewCount) && result.website ? " / " : ""}
                  {result.website ? "Website available" : ""}
                </em>
              )}
            </div>
          ))
        ) : (
          <p className="provider-empty">
            {provider.status === "success" ? "No businesses returned." : "No results loaded."}
          </p>
        )}
      </div>
    </section>
  );
}

function PracticesView({ practices }: { practices: Practice[] }) {
  return (
    <section className="view">
      <div className="view-header">
        <div>
          <p className="eyebrow">Market Records</p>
          <h2>Practices</h2>
        </div>
      </div>
      <section className="panel">
        <DataTable
          columns={["Practice", "Status", "Tier", "City", "Coordinates", "Website"]}
          rows={practices.map((practice) => [
            practice.name,
            statusLabel(practice.status),
            practice.tier,
            `${practice.city}, ${practice.state}`,
            `${practice.latitude.toFixed(4)}, ${practice.longitude.toFixed(4)}`,
            practice.website || "-",
          ])}
        />
      </section>
    </section>
  );
}

function AssetsView() {
  return (
    <section className="view">
      <div className="view-header">
        <div>
          <p className="eyebrow">Authority Assets</p>
          <h2>Authority Assets</h2>
        </div>
      </div>
      <section className="panel">
        <DataTable
          columns={["Asset", "Topic Cluster", "Intent", "Audience", "Status"]}
          rows={authorityAssets.map((asset) => {
            const topic = topicClusters.find((cluster) => cluster.id === asset.topic_cluster_id);
            return [
              asset.title,
              topic ? `${topic.name} / ${topic.category}` : "-",
              asset.intent,
              asset.audience,
              asset.status,
            ];
          })}
        />
      </section>
    </section>
  );
}

function AssignmentsView({
  assignments,
  practices,
}: {
  assignments: Assignment[];
  practices: Practice[];
}) {
  return (
    <section className="view">
      <div className="view-header">
        <div>
          <p className="eyebrow">Assignment Status</p>
          <h2>Assignments</h2>
        </div>
      </div>
      <section className="panel">
        <DataTable
          columns={["Practice", "Authority Asset", "Assignment Status", "Assigned"]}
          rows={assignments.map((assignment) => {
            const practice = practices.find((candidate) => candidate.id === assignment.practice_id);
            const asset = authorityAssets.find(
              (candidate) => candidate.id === assignment.authority_asset_id,
            );

            return [
              practice?.name ?? "-",
              asset?.title ?? "-",
              assignment.status,
              new Date(assignment.assigned_at).toLocaleDateString(),
            ];
          })}
        />
      </section>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DataTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${row[0]}-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <td key={`${cell}-${cellIndex}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
