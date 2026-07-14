import { FormEvent, MouseEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  assignments as seedAssignments,
  authorityAssets,
  practices as seedPractices,
  territories,
  topicClusters,
} from "./data/seedData";
import {
  authorityExperimentPairs,
  getAuthorityExperimentDashboardMetrics,
  getAuthorityExperimentPageByRoute,
  getAuthorityExperimentPageMetrics,
  getAuthorityExperimentPairBySlug,
  getVariantDashboardMetrics,
} from "./data/authorityExperiment";
import {
  architectureExperimentPairs,
  createArchitectureExperimentSchemaDrafts,
  getArchitectureExperimentMetrics,
  getArchitectureExperimentPageByRoute,
  getArchitectureExperimentPairBySlug,
} from "./data/architectureExperiment";
import {
  getKnowledgeClusterBySlug,
  getKnowledgeTotals,
  knowledgeTopicClusters,
  optometryKnowledgeNetwork,
} from "./data/knowledgeNetwork";
import {
  getClusterQuestionCount,
  getCoveragePercent,
  getKnowledgeInventoryStats,
  getQuestionInventoryForCluster,
} from "./data/knowledgeQuestionInventory";
import {
  getCrossClusterOverlapFlags,
  getPilotHubByCategory,
  getPilotHubByRoute,
  getPilotHubMetrics,
  pilotHubs,
} from "./data/pilotHubs";
import {
  getSalesIntelligenceMetrics,
  getStrongestSellingPoints,
  getTopAgenciesBySlipstreamFit,
  salesIntelligenceDataset,
} from "./data/salesIntelligence";
import { canAssignAsset } from "./lib/assignment";
import {
  createAuthorityExperimentSchemaDrafts,
  createPilotHubSchemaDrafts,
} from "./lib/knowledgeSchema";
import {
  getCompetitorCountsByRadius,
  getCompetitorsByDistance,
  recommendTerritory,
} from "./lib/territory";
import type {
  Assignment,
  ArchitectureExperimentPage,
  AuthorityAsset,
  AuthorityExperimentPage,
  KnowledgeIndustry,
  KnowledgePilotHub,
  KnowledgeTopicCluster,
  Practice,
} from "./types";

type RouteKey = string;

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
  { key: "practices", label: "Practices" },
  { key: "territory", label: "Territory Explorer" },
  { key: "assets", label: "Authority Assets" },
  { key: "assignments", label: "Assignments" },
  { key: "knowledge", label: "Knowledge Network" },
  { key: "lab/validation", label: "SE2.0 Lab" },
  { key: "experiment/se20-validation", label: "Architecture Test" },
  { key: "sales-intelligence", label: "Sales Intelligence" },
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

function isRouteKey(candidate: string) {
  if (routes.some((route) => route.key === candidate)) {
    return true;
  }

  if (
    candidate === "knowledge/validation" ||
    candidate === "lab/validation" ||
    candidate === "experiment/se20-validation" ||
    getPilotHubByRoute(candidate) ||
    getAuthorityExperimentPageByRoute(candidate) ||
    getArchitectureExperimentPageByRoute(candidate)
  ) {
    return true;
  }

  if (candidate.startsWith("knowledge/")) {
    return Boolean(getKnowledgeClusterBySlug(candidate.replace("knowledge/", "")));
  }

  return false;
}

function normalizeRoutePath(pathname: string) {
  return pathname.replace(/^\/admin\/tools\/?/, "").replace(/^\/+|\/+$/g, "") || "territory";
}

function routeFromLocation(): RouteKey {
  const hashRoute = window.location.hash.startsWith("#/")
    ? window.location.hash.replace("#/", "")
    : "";
  const candidate = hashRoute || normalizeRoutePath(window.location.pathname);
  return isRouteKey(candidate) ? candidate : "territory";
}

function pathForRoute(route: RouteKey) {
  return `/admin/tools/${route}`;
}

function routeKeyFromPath(path: string) {
  return path.replace(/^\/+/, "");
}

function statusLabel(status: string) {
  return status.replace("-", " ");
}

function App() {
  const [route, setRoute] = useState<RouteKey>(routeFromLocation);
  const [practices, setPractices] = useState<Practice[]>(seedPractices);
  const [selectedPracticeId, setSelectedPracticeId] = useState("practice-prospect-1");
  const [form, setForm] = useState<PracticeForm>(initialForm);
  const [selectedAssetId, setSelectedAssetId] = useState("asset-dry-eye-katy");

  useEffect(() => {
    const handleLocationChange = () => setRoute(routeFromLocation());
    window.addEventListener("hashchange", handleLocationChange);
    window.addEventListener("popstate", handleLocationChange);

    return () => {
      window.removeEventListener("hashchange", handleLocationChange);
      window.removeEventListener("popstate", handleLocationChange);
    };
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

  function navigateTo(nextRoute: RouteKey) {
    window.history.pushState(null, "", pathForRoute(nextRoute));
    setRoute(nextRoute);
    window.scrollTo({ top: 0 });
  }

  function handleRouteClick(event: MouseEvent<HTMLAnchorElement>, nextRoute: RouteKey) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }

    event.preventDefault();
    navigateTo(nextRoute);
  }

  const pilotHubRoute = getPilotHubByRoute(route);
  const isValidationRoute = route === "knowledge/validation";
  const experimentPage = getAuthorityExperimentPageByRoute(route);
  const isLabValidationRoute = route === "lab/validation";
  const architecturePage = getArchitectureExperimentPageByRoute(route);
  const isArchitectureValidationRoute = route === "experiment/se20-validation";
  const clusterRoute = route.startsWith("knowledge/") && !pilotHubRoute && !isValidationRoute
    ? getKnowledgeClusterBySlug(route.replace("knowledge/", ""))
    : undefined;

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
              className={
                route === item.key ||
                (item.key === "knowledge" && route.startsWith("knowledge/")) ||
                (item.key === "lab/validation" && route.startsWith("lab/")) ||
                (item.key === "experiment/se20-validation" && route.startsWith("experiment/"))
                  ? "nav-link active"
                  : "nav-link"
              }
              href={pathForRoute(item.key)}
              key={item.key}
              onClick={(event) => handleRouteClick(event, item.key)}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      <main className="content">
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
        {route === "knowledge" && (
          <KnowledgeNetworkRoot network={optometryKnowledgeNetwork} onNavigate={navigateTo} />
        )}
        {pilotHubRoute && <PilotHubView hub={pilotHubRoute} onNavigate={navigateTo} />}
        {isValidationRoute && <CrossClusterValidationView onNavigate={navigateTo} />}
        {experimentPage && <AuthorityExperimentPageView page={experimentPage} onNavigate={navigateTo} />}
        {isLabValidationRoute && <AuthorityExperimentValidationView onNavigate={navigateTo} />}
        {architecturePage && (
          <ArchitectureExperimentPageView page={architecturePage} onNavigate={navigateTo} />
        )}
        {isArchitectureValidationRoute && (
          <ArchitectureExperimentValidationView onNavigate={navigateTo} />
        )}
        {route === "sales-intelligence" && <SalesIntelligenceView />}
        {clusterRoute && (
          <KnowledgeClusterView cluster={clusterRoute} onNavigate={navigateTo} />
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

function KnowledgeNetworkRoot({
  network,
  onNavigate,
}: {
  network: KnowledgeIndustry;
  onNavigate: (route: RouteKey) => void;
}) {
  const totals = getKnowledgeTotals(network);
  const inventoryStats = getKnowledgeInventoryStats();

  return (
    <section className="view knowledge-view">
      <div className="view-header">
        <div>
          <p className="eyebrow">Knowledge Network</p>
          <h2>{network.rootTitle}</h2>
        </div>
        <span className="pill">{network.name}</span>
      </div>

      <section className="knowledge-hero">
        <div>
          <p className="eyebrow">SE2.0™ Authority System</p>
          <h3>Reusable visibility infrastructure, starting with optometry.</h3>
          <p>
            This foundation defines the URL structure, topic hierarchy, inventory targets,
            and internal linking model before large-scale question pages are generated.
          </p>
        </div>
        <div className="network-path" aria-label="Knowledge Network hierarchy">
          <span>Industry</span>
          <strong>Topic Cluster</strong>
          <strong>Category</strong>
          <strong>Question</strong>
        </div>
      </section>

      <div className="metric-grid knowledge-metrics">
        <Metric label="Active Topic Clusters" value={String(network.topicClusters.length)} />
        <Metric label="Category Count" value={String(totals.categories)} />
        <Metric label="Target Questions" value={String(totals.targetQuestions)} />
        <Metric label="Questions Generated" value={String(inventoryStats.totalQuestions)} />
      </div>

      <section className="panel">
        <div className="panel-heading">
          <h3>Cross-Cluster Validation</h3>
          <RouteAnchor className="text-link" onNavigate={onNavigate} route="knowledge/validation">
            Open validation
          </RouteAnchor>
        </div>
        <p className="overview-copy">
          Compare the active pilot hubs side by side and flag duplicated concepts, duplicated
          answers, repeated phrasing, and weak differentiation before scaling content production.
        </p>
      </section>

      <div className="cluster-grid">
        {network.topicClusters.map((cluster) => {
          const questionCount = getClusterQuestionCount(cluster.slug);
          const coveragePercent = getCoveragePercent(questionCount, cluster.targetQuestionCount);

          return (
            <article className="cluster-card" key={cluster.id}>
              <div className="panel-heading">
                <h3>{cluster.name}</h3>
                <span className="pill">{coveragePercent}% coverage</span>
              </div>
              <p>{cluster.overview}</p>
              <div className="cluster-stats">
                <Metric label="Questions Generated" value={String(questionCount)} />
                <Metric label="Target Questions" value={String(cluster.targetQuestionCount)} />
                <Metric label="Coverage %" value={`${coveragePercent}%`} />
                <Metric label="Category Count" value={String(cluster.categories.length)} />
              </div>
              <RouteAnchor
                className="text-link"
                onNavigate={onNavigate}
                route={`knowledge/${cluster.slug}`}
              >
                Open cluster
              </RouteAnchor>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function KnowledgeClusterView({
  cluster,
  onNavigate,
}: {
  cluster: KnowledgeTopicCluster;
  onNavigate: (route: RouteKey) => void;
}) {
  const inventory = getQuestionInventoryForCluster(cluster.slug);
  const questionCount = getClusterQuestionCount(cluster.slug);
  const coveragePercent = getCoveragePercent(questionCount, cluster.targetQuestionCount);
  const relatedClusters = cluster.relatedClusterSlugs
    .map((slug) => knowledgeTopicClusters.find((candidate) => candidate.slug === slug))
    .filter((candidate): candidate is KnowledgeTopicCluster => Boolean(candidate));

  return (
    <section className="view knowledge-view">
      <div className="view-header">
        <div>
          <p className="eyebrow">
            <RouteAnchor className="breadcrumb-link" onNavigate={onNavigate} route="knowledge">
              Vision Care Knowledge Network
            </RouteAnchor>
          </p>
          <h2>{cluster.name}</h2>
        </div>
        <span className="pill">/{cluster.slug}</span>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <h3>Overview</h3>
          <span className="muted">Structure only</span>
        </div>
        <p className="overview-copy">{cluster.overview}</p>
        <div className="metric-grid">
          <Metric label="Questions Generated" value={String(questionCount)} />
          <Metric label="Target Questions" value={String(cluster.targetQuestionCount)} />
          <Metric label="Coverage %" value={`${coveragePercent}%`} />
          <Metric label="Category Count" value={String(cluster.categories.length)} />
        </div>
      </section>

      <div className="knowledge-detail-grid">
        <section className="panel">
          <div className="panel-heading">
            <h3>Categories</h3>
            <span className="muted">Parent category layer</span>
          </div>
          <div className="category-list">
            {(inventory?.categories ?? cluster.categories).map((category) => {
              const categorySlug = "categorySlug" in category ? category.categorySlug : category.slug;
              const label =
                "categoryName" in category
                  ? `${category.categoryName} (${category.questions.length})`
                  : category.name;
              const pilotHub = getPilotHubByCategory(cluster.slug, categorySlug);

              if (pilotHub) {
                return (
                  <RouteAnchor
                    className="category-chip category-link"
                    key={categorySlug}
                    onNavigate={onNavigate}
                    route={routeKeyFromPath(pilotHub.route)}
                  >
                    {label}
                  </RouteAnchor>
                );
              }

              return (
                <span className="category-chip" id={categorySlug} key={categorySlug}>
                  {label}
                </span>
              );
            })}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h3>Internal Linking</h3>
            <span className="muted">Question object support</span>
          </div>
          <ul className="linking-list">
            <li>Parent Topic: {cluster.name}</li>
            <li>Parent Category: category slug on each question</li>
            <li>Related Questions: question slug array</li>
            <li>Related Categories: category slug array</li>
          </ul>
        </section>
      </div>

      <div className="knowledge-detail-grid">
        <section className="panel">
          <div className="panel-heading">
            <h3>Example Questions</h3>
            <span className="muted">Inventory prompts only</span>
          </div>
          <ul className="question-list">
            {(inventory?.categories.flatMap((category) => category.questions).slice(0, 8) ??
              cluster.exampleQuestions
            ).map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h3>Related Clusters</h3>
            <span className="muted">Cross-link targets</span>
          </div>
          <div className="related-list">
            {relatedClusters.map((relatedCluster) => (
              <RouteAnchor
                className="related-link"
                key={relatedCluster.id}
                onNavigate={onNavigate}
                route={`knowledge/${relatedCluster.slug}`}
              >
                {relatedCluster.name}
              </RouteAnchor>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function PilotHubView({
  hub,
  onNavigate,
}: {
  hub: KnowledgePilotHub;
  onNavigate: (route: RouteKey) => void;
}) {
  const cluster = getKnowledgeClusterBySlug(hub.topicSlug);
  const category = cluster?.categories.find((candidate) => candidate.slug === hub.categorySlug);
  const relatedCategories =
    cluster?.categories.filter((candidate) => hub.relatedCategorySlugs.includes(candidate.slug)) ?? [];
  const metrics = getPilotHubMetrics(hub);
  const schemaDrafts = createPilotHubSchemaDrafts(hub);
  const schemaCoverage = schemaDrafts.length === 3 ? 100 : Math.round((schemaDrafts.length / 3) * 100);

  return (
    <section className="view knowledge-view">
      <div className="view-header">
        <div>
          <p className="eyebrow">
            <RouteAnchor className="breadcrumb-link" onNavigate={onNavigate} route="knowledge">
              Vision Care Knowledge Network
            </RouteAnchor>
            <span className="breadcrumb-separator">/</span>
            <RouteAnchor
              className="breadcrumb-link"
              onNavigate={onNavigate}
              route={`knowledge/${hub.topicSlug}`}
            >
              {hub.topicName}
            </RouteAnchor>
          </p>
          <h2>{hub.title} Authority Hub</h2>
        </div>
        <span className="pill">Pilot Cluster</span>
      </div>

      <section className="knowledge-hero">
        <div>
          <p className="eyebrow">
            {hub.topicName} / {hub.categoryName}
          </p>
          <h3>Single-category pilot for answer quality, internal linking, and retrievability.</h3>
          <p>{hub.overview}</p>
        </div>
        <div className="network-path" aria-label="Pilot Knowledge Network hierarchy">
          <span>Optometry</span>
          <strong>{hub.topicName}</strong>
          <strong>{category?.name ?? hub.categoryName}</strong>
          <strong>{hub.questions.length} Pilot Questions</strong>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h3>Category Overview</h3>
          <span className="muted">Patient-facing hub</span>
        </div>
        <p className="overview-copy">{hub.overview}</p>
        <div className="category-list">
          <RouteAnchor
            className="related-link"
            onNavigate={onNavigate}
            route={`knowledge/${hub.topicSlug}`}
          >
            Parent Topic: {hub.topicName}
          </RouteAnchor>
          <RouteAnchor
            className="related-link"
            onNavigate={onNavigate}
            route={routeKeyFromPath(hub.route)}
          >
            Parent Category: {hub.categoryName}
          </RouteAnchor>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h3>Pilot Review Screen</h3>
          <span className="muted">Derived from pilot data</span>
        </div>
        <div className="metric-grid">
          <Metric label="Question Count" value={String(metrics.questionCount)} />
          <Metric label="Word Count" value={String(metrics.totalWordCount)} />
          <Metric label="Average Answer Length" value={`${metrics.averageAnswerLength} words`} />
          <Metric label="Internal Links Created" value={String(metrics.internalLinksCreated)} />
          <Metric label="Related Question Links" value={String(metrics.relatedQuestionLinks)} />
          <Metric label="Schema Coverage" value={`${schemaCoverage}%`} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h3>Pilot Questions</h3>
          <span className="muted">Expandable answers</span>
        </div>
        <div className="qa-list">
          {hub.questions.map((question, index) => (
            <details className="qa-card" id={question.slug} key={question.id}>
              <summary>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{question.question}</strong>
              </summary>
              <div className="qa-content">
                <div className="answer-block">
                  <h4>Short Answer</h4>
                  <p>{question.shortAnswer}</p>
                </div>
                <div className="answer-block">
                  <h4>Long Answer</h4>
                  {question.longAnswer.split("\n\n").map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>

                <div className="question-link-grid">
                  <div>
                    <h4>Parent Links</h4>
                    <div className="related-list compact">
                      <RouteAnchor
                        className="related-link"
                        onNavigate={onNavigate}
                        route={`knowledge/${question.parentTopicSlug}`}
                      >
                        {question.topic}
                      </RouteAnchor>
                      <RouteAnchor
                        className="related-link"
                        onNavigate={onNavigate}
                        route={`knowledge/${question.parentTopicSlug}/${question.parentCategorySlug}`}
                      >
                        {question.category}
                      </RouteAnchor>
                    </div>
                  </div>

                  <div>
                    <h4>Related Questions</h4>
                    <div className="related-list compact">
                      {question.relatedQuestions.map((relatedSlug) => {
                        const relatedQuestion = hub.questions.find(
                          (candidate) => candidate.slug === relatedSlug,
                        );

                        return (
                          <a className="related-link" href={`#${relatedSlug}`} key={relatedSlug}>
                            {relatedQuestion?.question ?? relatedSlug}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="tag-row">
                  {question.tags.map((tag) => (
                    <span className="category-chip" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="citation-placeholder">
                  {question.citations.map((citation) => (
                    <span key={citation.note}>{citation.note}</span>
                  ))}
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>

      <div className="knowledge-detail-grid">
        <section className="panel">
          <div className="panel-heading">
            <h3>Related Categories</h3>
            <span className="muted">Future cross-link targets</span>
          </div>
          <div className="related-list">
            {relatedCategories.map((category) => (
              <a
                className="related-link"
                href={`/knowledge/${hub.topicSlug}#${category.slug}`}
                key={category.id}
              >
                {category.name}
              </a>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h3>Schema Drafts</h3>
            <span className="muted">Not wired to production</span>
          </div>
          <div className="schema-list">
            {schemaDrafts.map((schema) => (
              <div className="schema-row" key={schema.type}>
                <span>{schema.type.toUpperCase()}</span>
                <strong>{schema.itemCount} items</strong>
                <em>{schema.status}</em>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function CrossClusterValidationView({ onNavigate }: { onNavigate: (route: RouteKey) => void }) {
  const metrics = pilotHubs.map((hub) => getPilotHubMetrics(hub));
  const flags = getCrossClusterOverlapFlags(pilotHubs);

  return (
    <section className="view knowledge-view">
      <div className="view-header">
        <div>
          <p className="eyebrow">
            <RouteAnchor className="breadcrumb-link" onNavigate={onNavigate} route="knowledge">
              Vision Care Knowledge Network
            </RouteAnchor>
          </p>
          <h2>Cross-Cluster Validation</h2>
        </div>
        <span className="pill">{pilotHubs.length} pilot hubs</span>
      </div>

      <section className="knowledge-hero">
        <div>
          <p className="eyebrow">SE2.0 Authority Model</p>
          <h3>Side-by-side comparison for intent differentiation.</h3>
          <p>
            This screen compares the five pilot hubs to test whether different consumer intents
            produce distinct authority assets or collapse into repeated explanations, phrasing,
            and generic advice.
          </p>
        </div>
        <div className="network-path" aria-label="Validation dimensions">
          <span>Question Count</span>
          <strong>Answer Depth</strong>
          <strong>Internal Links</strong>
          <strong>Overlap Flags</strong>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h3>Side-by-Side Metrics</h3>
          <span className="muted">Derived from pilot data</span>
        </div>
        <div className="comparison-grid">
          {metrics.map((item) => (
            <article className="comparison-card" key={item.hubId}>
              <div className="panel-heading">
                <h3>{item.title}</h3>
                <RouteAnchor
                  className="text-link"
                  onNavigate={onNavigate}
                  route={routeKeyFromPath(item.route)}
                >
                  Open hub
                </RouteAnchor>
              </div>
              <div className="mini-metrics">
                <Metric label="Question Count" value={String(item.questionCount)} />
                <Metric label="Word Count" value={String(item.totalWordCount)} />
                <Metric label="Internal Links" value={String(item.internalLinksCreated)} />
                <Metric label="Related Links" value={String(item.relatedQuestionLinks)} />
                <Metric label="Average Answer Length" value={`${item.averageAnswerLength} words`} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h3>Overlap Flags</h3>
          <span className="muted">Concepts, answers, phrasing, differentiation</span>
        </div>
        <div className="flag-list">
          {flags.map((flag) => (
            <article className={`flag-card ${flag.severity}`} key={`${flag.type}-${flag.label}`}>
              <div>
                <span>{flag.type}</span>
                <h3>{flag.label}</h3>
              </div>
              <p>{flag.detail}</p>
              <strong>{flag.hubs.join(" / ")}</strong>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function AuthorityExperimentPageView({
  page,
  onNavigate,
}: {
  page: AuthorityExperimentPage;
  onNavigate: (route: RouteKey) => void;
}) {
  const pair = getAuthorityExperimentPairBySlug(page.slug);
  const counterpart = page.variant === "A" ? pair?.variantB : pair?.variantA;
  const metrics = getAuthorityExperimentPageMetrics(page);
  const schemaDrafts = createAuthorityExperimentSchemaDrafts(page);
  const relatedPairs = page.relatedQuestions
    .map((slug) => getAuthorityExperimentPairBySlug(slug))
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));

  return (
    <section className="view knowledge-view">
      {schemaDrafts.map((schema) => (
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema.payload) }}
          key={schema.type}
          type="application/ld+json"
        />
      ))}

      <div className="view-header">
        <div>
          <p className="eyebrow">
            <RouteAnchor className="breadcrumb-link" onNavigate={onNavigate} route="lab/validation">
              SE2.0 Authority Experiment
            </RouteAnchor>
          </p>
          <h2>{page.question}</h2>
        </div>
        <span className={`variant-badge variant-${page.variant.toLowerCase()}`}>
          Variant {page.variant}: {page.variantLabel}
        </span>
      </div>

      <section className="knowledge-hero lab-hero">
        <div>
          <p className="eyebrow">
            {page.topic} / {page.category}
          </p>
          <h3>Same intent, same structure, different answer quality style.</h3>
          <p>
            This page is part of a controlled authority experiment comparing machine-generated
            content with OD-reviewed content while holding URL pattern, layout, schema, and
            internal linking constant.
          </p>
        </div>
        <div className="network-path" aria-label="Experiment metadata">
          <span>{page.experimentId}</span>
          <strong>{page.questionId}</strong>
          <strong>Variant {page.variant}</strong>
          <strong>{page.createdAt}</strong>
        </div>
      </section>

      <div className="lab-grid">
        <section className="panel">
          <div className="panel-heading">
            <h3>Answer</h3>
            <span className="muted">Structured Q&A</span>
          </div>
          <div className="answer-block lab-answer">
            <h4>Short Answer</h4>
            <p>{page.shortAnswer}</p>
          </div>
          <div className="answer-block lab-answer">
            <h4>Long Answer</h4>
            {page.longAnswer.split("\n\n").map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h3>Experiment Controls</h3>
            <span className="muted">Held constant</span>
          </div>
          <div className="metric-grid">
            <Metric label="Word Count" value={String(metrics.wordCount)} />
            <Metric label="Internal Links" value={String(metrics.internalLinks)} />
            <Metric label="Related Links" value={String(metrics.relatedLinks)} />
            <Metric label="Schema Coverage" value={`${metrics.schemaCoveragePercent}%`} />
          </div>
          <div className="experiment-note">
            <strong>No canonical pairing</strong>
            <span>Variant pages are independent experiment URLs with matching schema types.</span>
          </div>
          {counterpart && (
            <RouteAnchor
              className="related-link"
              onNavigate={onNavigate}
              route={routeKeyFromPath(counterpart.route)}
            >
              Open counterpart variant
            </RouteAnchor>
          )}
        </section>
      </div>

      <div className="knowledge-detail-grid">
        <section className="panel">
          <div className="panel-heading">
            <h3>Internal Linking</h3>
            <span className="muted">Same targets per variant</span>
          </div>
          <div className="related-list">
            <RouteAnchor
              className="related-link"
              onNavigate={onNavigate}
              route={`knowledge/${page.topicSlug}`}
            >
              Parent Topic: {page.topic}
            </RouteAnchor>
            <a className="related-link" href={`/knowledge/${page.topicSlug}#${page.categorySlug}`}>
              Parent Category: {page.category}
            </a>
          </div>
          <div className="related-list">
            {relatedPairs.map((relatedPair) => {
              const relatedPage =
                page.variant === "A" ? relatedPair.variantA : relatedPair.variantB;

              return (
                <RouteAnchor
                  className="related-link"
                  key={relatedPair.questionId}
                  onNavigate={onNavigate}
                  route={routeKeyFromPath(relatedPage.route)}
                >
                  {relatedPair.question}
                </RouteAnchor>
              );
            })}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h3>Schema Included</h3>
            <span className="muted">FAQ / Q&A / Breadcrumb</span>
          </div>
          <div className="schema-list">
            {schemaDrafts.map((schema) => (
              <div className="schema-row" key={schema.type}>
                <span>{schema.type.toUpperCase()}</span>
                <strong>{schema.itemCount} items</strong>
                <em>{schema.status}</em>
              </div>
            ))}
          </div>
          <div className="citation-placeholder">
            {page.citations.map((citation) => (
              <span key={citation.note}>{citation.note}</span>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function AuthorityExperimentValidationView({ onNavigate }: { onNavigate: (route: RouteKey) => void }) {
  const dashboardMetrics = getAuthorityExperimentDashboardMetrics();
  const variantAMetrics = getVariantDashboardMetrics("A");
  const variantBMetrics = getVariantDashboardMetrics("B");

  return (
    <section className="view knowledge-view">
      <div className="view-header">
        <div>
          <p className="eyebrow">SE2.0 Authority Experiment</p>
          <h2>OD Review vs Machine-Generated Validation</h2>
        </div>
        <span className="pill">{dashboardMetrics.experimentId}</span>
      </div>

      <section className="knowledge-hero lab-hero">
        <div>
          <p className="eyebrow">Controlled Authority Test</p>
          <h3>Does expert-reviewed content perform differently when intent and structure are held constant?</h3>
          <p>
            This framework compares two independently indexable content variants for the same
            ten questions. Analytics are mocked for now, with placeholders for Google Search
            Console, GA4, and server log integrations.
          </p>
        </div>
        <div className="network-path" aria-label="Experiment structure">
          <span>10 Paired Questions</span>
          <strong>Variant A: Machine-Generated</strong>
          <strong>Variant B: OD-Reviewed</strong>
          <strong>No Canonical Tags</strong>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h3>Experiment Dashboard</h3>
          <span className="muted">Mock analytics</span>
        </div>
        <div className="metric-grid dashboard-metrics">
          <Metric label="Page Count" value={String(dashboardMetrics.pageCount)} />
          <Metric label="Variant A Count" value={String(dashboardMetrics.variantACount)} />
          <Metric label="Variant B Count" value={String(dashboardMetrics.variantBCount)} />
          <Metric label="Indexed Pages" value={String(dashboardMetrics.indexedPages)} />
          <Metric label="Impressions" value={String(dashboardMetrics.impressions)} />
          <Metric label="Clicks" value={String(dashboardMetrics.clicks)} />
          <Metric label="CTR" value={`${dashboardMetrics.ctr}%`} />
          <Metric
            label="Average Position"
            value={
              dashboardMetrics.averagePosition === null
                ? "-"
                : String(dashboardMetrics.averagePosition)
            }
          />
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h3>Variant Snapshot</h3>
          <span className="muted">Outcome comparison shell</span>
        </div>
        <div className="variant-grid">
          <VariantMetricCard label="Variant A" metrics={variantAMetrics} />
          <VariantMetricCard label="Variant B" metrics={variantBMetrics} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h3>Integration Targets</h3>
          <span className="muted">Stubbed for later</span>
        </div>
        <div className="source-grid">
          <div className="source-card">
            <strong>Google Search Console</strong>
            <span>Indexing, impressions, clicks, CTR, average position</span>
          </div>
          <div className="source-card">
            <strong>GA4</strong>
            <span>Referral sessions, engagement, conversion events</span>
          </div>
          <div className="source-card">
            <strong>Server Logs</strong>
            <span>Crawler hits, bot activity, response status, recrawl cadence</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h3>Paired Question Output</h3>
          <span className="muted">10-question pilot only</span>
        </div>
        <DataTable
          columns={["Question", "Variant A URL", "Variant B URL", "Status"]}
          rows={authorityExperimentPairs.map((pair) => [
            pair.question,
            pair.variantA.route,
            pair.variantB.route,
            pair.status,
          ])}
        />
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h3>Open Test Pages</h3>
          <span className="muted">Side-by-side review</span>
        </div>
        <div className="pair-list">
          {authorityExperimentPairs.map((pair) => (
            <article className="pair-card" key={pair.questionId}>
              <div>
                <span className={`status-badge status-${pair.status.toLowerCase().replace(/\s+/g, "-")}`}>
                  {pair.status}
                </span>
                <h3>{pair.question}</h3>
                <p>{pair.intent}</p>
              </div>
              <div className="related-list compact">
                <RouteAnchor
                  className="related-link"
                  onNavigate={onNavigate}
                  route={routeKeyFromPath(pair.variantA.route)}
                >
                  Variant A
                </RouteAnchor>
                <RouteAnchor
                  className="related-link"
                  onNavigate={onNavigate}
                  route={routeKeyFromPath(pair.variantB.route)}
                >
                  Variant B
                </RouteAnchor>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function VariantMetricCard({
  label,
  metrics,
}: {
  label: string;
  metrics: ReturnType<typeof getVariantDashboardMetrics>;
}) {
  return (
    <article className="comparison-card">
      <div className="panel-heading">
        <h3>{label}</h3>
        <span className="muted">{metrics.pageCount} pages</span>
      </div>
      <div className="mini-metrics">
        <Metric label="Indexed Pages" value={String(metrics.indexedPages)} />
        <Metric label="Impressions" value={String(metrics.impressions)} />
        <Metric label="Clicks" value={String(metrics.clicks)} />
        <Metric label="CTR" value={`${metrics.ctr}%`} />
        <Metric
          label="Avg Position"
          value={metrics.averagePosition === null ? "-" : String(metrics.averagePosition)}
        />
      </div>
    </article>
  );
}

function ArchitectureExperimentPageView({
  page,
  onNavigate,
}: {
  page: ArchitectureExperimentPage;
  onNavigate: (route: RouteKey) => void;
}) {
  const pair = getArchitectureExperimentPairBySlug(page.slug);
  const counterpart = page.variant === "traditional" ? pair?.se20 : pair?.traditional;
  const metrics = getArchitectureExperimentMetrics(page);
  const schemaDrafts = createArchitectureExperimentSchemaDrafts(page);
  const variantLabel =
    page.variant === "traditional" ? "Traditional SEO Content" : "SE2.0 Authority Architecture";

  return (
    <section className="view knowledge-view">
      {schemaDrafts.map((schema) => (
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema.payload) }}
          key={schema.type}
          type="application/ld+json"
        />
      ))}

      <div className="view-header">
        <div>
          <p className="eyebrow">
            <RouteAnchor
              className="breadcrumb-link"
              onNavigate={onNavigate}
              route="experiment/se20-validation"
            >
              SE2.0 Architecture Experiment
            </RouteAnchor>
          </p>
          <h2>{page.title}</h2>
        </div>
        <span
          className={
            page.variant === "traditional"
              ? "variant-badge variant-a"
              : "variant-badge variant-b"
          }
        >
          {variantLabel}
        </span>
      </div>

      <section className="knowledge-hero lab-hero">
        <div>
          <p className="eyebrow">
            {page.topic} / {page.category}
          </p>
          <h3>
            {page.variant === "traditional"
              ? "Single article, minimal internal linking, traditional blog structure."
              : "Question network, related entities, cross-links, and structured answer paths."}
          </h3>
          <p>
            This page is one side of a paired architecture test. The topic and approximate
            word count are held close while the content structure changes.
          </p>
        </div>
        <div className="network-path" aria-label="Architecture metrics">
          <span>{page.experimentId}</span>
          <strong>{metrics.wordCount} Words</strong>
          <strong>{metrics.internalLinks} Internal Links</strong>
          <strong>{metrics.schemaTypes} Schema Types</strong>
        </div>
      </section>

      <div className="lab-grid">
        <section className="panel">
          <div className="panel-heading">
            <h3>{page.variant === "traditional" ? "Article Body" : "Question Network"}</h3>
            <span className="muted">
              {page.variant === "traditional" ? "Blog format" : "Authority format"}
            </span>
          </div>

          {page.variant === "traditional" ? (
            <div className="article-sections">
              {page.sections.map((section) => (
                <article className="article-section" key={section.heading}>
                  <h4>{section.heading}</h4>
                  <p>{section.body}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="qa-list">
              {page.questions.map((question, index) => (
                <article
                  className={
                    question.id === page.primaryQuestionId
                      ? "qa-card architecture-question primary-question"
                      : "qa-card architecture-question"
                  }
                  id={question.id}
                  key={question.id}
                >
                  <div className="qa-content">
                    <div className="panel-heading">
                      <h3>{question.question}</h3>
                      <span className="pill">
                        {index === 0 ? "Primary Question" : "Related Question"}
                      </span>
                    </div>
                    <p>{question.answer}</p>
                    <div className="related-list compact">
                      {question.relatedQuestionIds.map((relatedId) => {
                        const relatedQuestion = page.questions.find(
                          (candidate) => candidate.id === relatedId,
                        );

                        return (
                          <a className="related-link" href={`#${relatedId}`} key={relatedId}>
                            {relatedQuestion?.question ?? relatedId}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h3>Architecture Metrics</h3>
            <span className="muted">Derived from page structure</span>
          </div>
          <div className="metric-grid">
            <Metric label="Word Count" value={String(metrics.wordCount)} />
            <Metric label="Internal Links" value={String(metrics.internalLinks)} />
            <Metric label="Related Question Links" value={String(metrics.relatedQuestionLinks)} />
            <Metric label="Entity References" value={String(metrics.entityReferences)} />
            <Metric label="Schema Types" value={String(metrics.schemaTypes)} />
            <Metric label="Question Count" value={String(metrics.questionCount)} />
          </div>
          {counterpart && (
            <RouteAnchor
              className="related-link"
              onNavigate={onNavigate}
              route={routeKeyFromPath(counterpart.route)}
            >
              Open paired {counterpart.variant === "traditional" ? "Traditional" : "SE2.0"} page
            </RouteAnchor>
          )}
        </section>
      </div>

      <div className="knowledge-detail-grid">
        <section className="panel">
          <div className="panel-heading">
            <h3>{page.variant === "traditional" ? "Minimal Links" : "Network Links"}</h3>
            <span className="muted">Internal architecture</span>
          </div>
          <div className="related-list">
            {page.variant === "traditional"
              ? page.internalLinks.map((link) => (
                  <RouteAnchor
                    className="related-link"
                    key={link}
                    onNavigate={onNavigate}
                    route={routeKeyFromPath(link)}
                  >
                    {link}
                  </RouteAnchor>
                ))
              : page.crossLinks.map((link) => (
                  <RouteAnchor
                    className="related-link"
                    key={link}
                    onNavigate={onNavigate}
                    route={routeKeyFromPath(link)}
                  >
                    {link}
                  </RouteAnchor>
                ))}
          </div>
          {page.variant === "se20" && (
            <>
              <h4 className="subheading">Related Categories</h4>
              <div className="category-list">
                {page.relatedCategories.map((category) => (
                  <span className="category-chip" key={category}>
                    {category}
                  </span>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h3>{page.variant === "traditional" ? "Entity Mentions" : "Entity Relationships"}</h3>
            <span className="muted">Architecture signal</span>
          </div>
          {page.variant === "traditional" ? (
            <div className="tag-row">
              {page.entityReferences.map((entity) => (
                <span className="category-chip" key={entity}>
                  {entity}
                </span>
              ))}
            </div>
          ) : (
            <div className="entity-list">
              {page.entityRelationships.map((relationship) => (
                <div className="entity-row" key={relationship.entity}>
                  <strong>{relationship.entity}</strong>
                  <span>{relationship.relationship}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <h3>Schema Types</h3>
          <span className="muted">Indexable independently</span>
        </div>
        <div className="schema-list">
          {schemaDrafts.map((schema) => (
            <div className="schema-row" key={schema.type}>
              <span>{schema.type.toUpperCase()}</span>
              <strong>{schema.itemCount} items</strong>
              <em>{schema.status}</em>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function ArchitectureExperimentValidationView({
  onNavigate,
}: {
  onNavigate: (route: RouteKey) => void;
}) {
  const comparisonRows = architectureExperimentPairs.map((pair) => {
    const traditionalMetrics = getArchitectureExperimentMetrics(pair.traditional);
    const se20Metrics = getArchitectureExperimentMetrics(pair.se20);

    return {
      pair,
      traditionalMetrics,
      se20Metrics,
    };
  });

  const traditionalTotals = comparisonRows.reduce(
    (totals, row) => ({
      words: totals.words + row.traditionalMetrics.wordCount,
      links: totals.links + row.traditionalMetrics.internalLinks,
      schemas: totals.schemas + row.traditionalMetrics.schemaTypes,
      questions: totals.questions + row.traditionalMetrics.questionCount,
      entities: totals.entities + row.traditionalMetrics.entityReferences,
    }),
    { words: 0, links: 0, schemas: 0, questions: 0, entities: 0 },
  );
  const se20Totals = comparisonRows.reduce(
    (totals, row) => ({
      words: totals.words + row.se20Metrics.wordCount,
      links: totals.links + row.se20Metrics.internalLinks,
      schemas: totals.schemas + row.se20Metrics.schemaTypes,
      questions: totals.questions + row.se20Metrics.questionCount,
      entities: totals.entities + row.se20Metrics.entityReferences,
    }),
    { words: 0, links: 0, schemas: 0, questions: 0, entities: 0 },
  );

  return (
    <section className="view knowledge-view">
      <div className="view-header">
        <div>
          <p className="eyebrow">SE2.0 Architecture Experiment</p>
          <h2>Traditional SEO vs SE2.0 Authority Architecture</h2>
        </div>
        <span className="pill">{architectureExperimentPairs.length} topics</span>
      </div>

      <section className="knowledge-hero lab-hero">
        <div>
          <p className="eyebrow">Core Hypothesis</p>
          <h3>Does a structured authority network perform differently from traditional SEO content?</h3>
          <p>
            This experiment compares single-article pages against question-network pages on the
            same five topics with similar word counts. The measured difference is architecture:
            links, questions, entities, schema, and relationship structure.
          </p>
        </div>
        <div className="network-path" aria-label="Experiment variants">
          <span>Variant A: Traditional SEO</span>
          <strong>Single Article</strong>
          <strong>Minimal Internal Links</strong>
          <strong>Article Schema</strong>
          <span>Variant B: SE2.0</span>
          <strong>Question Network</strong>
          <strong>Entity Relationships</strong>
          <strong>FAQ / Q&A / Breadcrumb / ItemList</strong>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h3>Architecture Totals</h3>
          <span className="muted">Five paired topics</span>
        </div>
        <div className="variant-grid">
          <ArchitectureTotalsCard label="Traditional SEO" totals={traditionalTotals} />
          <ArchitectureTotalsCard label="SE2.0" totals={se20Totals} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h3>Side-by-Side Comparison</h3>
          <span className="muted">Architecture metrics only</span>
        </div>
        <DataTable
          columns={[
            "Topic",
            "Traditional",
            "SE2.0",
            "Word Count",
            "Internal Links",
            "Schema",
            "Question Count",
          ]}
          rows={comparisonRows.map((row) => [
            row.pair.topic,
            row.pair.traditional.route,
            row.pair.se20.route,
            `${row.traditionalMetrics.wordCount} / ${row.se20Metrics.wordCount}`,
            `${row.traditionalMetrics.internalLinks} / ${row.se20Metrics.internalLinks}`,
            `${row.traditionalMetrics.schemaTypes} / ${row.se20Metrics.schemaTypes}`,
            `${row.traditionalMetrics.questionCount} / ${row.se20Metrics.questionCount}`,
          ])}
        />
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h3>Open Paired Pages</h3>
          <span className="muted">Traditional vs SE2.0</span>
        </div>
        <div className="pair-list">
          {comparisonRows.map((row) => (
            <article className="pair-card" key={row.pair.topicId}>
              <div>
                <span className="status-badge status-indexed">Architecture Pair</span>
                <h3>{row.pair.topic}</h3>
                <p>
                  Word count delta:{" "}
                  {Math.abs(row.traditionalMetrics.wordCount - row.se20Metrics.wordCount)} words
                </p>
              </div>
              <div className="related-list compact">
                <RouteAnchor
                  className="related-link"
                  onNavigate={onNavigate}
                  route={routeKeyFromPath(row.pair.traditional.route)}
                >
                  Traditional
                </RouteAnchor>
                <RouteAnchor
                  className="related-link"
                  onNavigate={onNavigate}
                  route={routeKeyFromPath(row.pair.se20.route)}
                >
                  SE2.0
                </RouteAnchor>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function ArchitectureTotalsCard({
  label,
  totals,
}: {
  label: string;
  totals: {
    words: number;
    links: number;
    schemas: number;
    questions: number;
    entities: number;
  };
}) {
  return (
    <article className="comparison-card">
      <div className="panel-heading">
        <h3>{label}</h3>
        <span className="muted">Total architecture</span>
      </div>
      <div className="mini-metrics">
        <Metric label="Words" value={String(totals.words)} />
        <Metric label="Internal Links" value={String(totals.links)} />
        <Metric label="Schema Types" value={String(totals.schemas)} />
        <Metric label="Questions" value={String(totals.questions)} />
        <Metric label="Entities" value={String(totals.entities)} />
      </div>
    </article>
  );
}

function SalesIntelligenceView() {
  const metrics = getSalesIntelligenceMetrics();
  const strongestSellingPoints = getStrongestSellingPoints();
  const topFitAgencies = getTopAgenciesBySlipstreamFit(12);
  const evidenceAgencies = salesIntelligenceDataset.agencies.slice(0, 18);

  return (
    <section className="view knowledge-view sales-intelligence-view">
      <div className="view-header">
        <div>
          <p className="eyebrow">Research Module</p>
          <h2>Sales Intelligence</h2>
        </div>
        <span className="pill">{metrics.agencyCount} agencies</span>
      </div>

      <section className="knowledge-hero research-hero">
        <div>
          <p className="eyebrow">Competitive Sales Claims</p>
          <h3>How leading SEO agencies sell SEO, mapped to Slipstream's optometry offer.</h3>
          <p>
            This module stores sourced agency positioning, recurring selling points, proof signals,
            buyer-fit scoring, and recommended Slipstream sales language. Claims are backed by short
            source snippets and URLs in the dataset.
          </p>
        </div>
        <div className="network-path">
          <span>Exports</span>
          <a href="/sales-intelligence/agencies.json">agencies.json</a>
          <a href="/sales-intelligence/agencies.csv">agencies.csv</a>
          <a href="/sales-intelligence/selling-points.json">selling-points.json</a>
        </div>
      </section>

      <div className="metric-grid knowledge-metrics">
        <Metric label="Agencies Seeded" value={String(metrics.agencyCount)} />
        <Metric label="Source Pages" value={String(metrics.sourceCount)} />
        <Metric label="Claim Records" value={String(metrics.claimCount)} />
        <Metric label="High Local Emphasis" value={String(metrics.highLocalCount)} />
        <Metric label="High AI/GEO/AEO" value={String(metrics.highAiCount)} />
      </div>

      <section className="panel">
        <div className="panel-heading">
          <h3>Strongest Selling Points</h3>
          <span className="muted">Ranked by frequency, proof, OD appeal, fit, differentiation</span>
        </div>
        <DataTable
          columns={["Selling Point", "Agencies", "Scores", "Example Agencies", "Slipstream Mapping"]}
          rows={strongestSellingPoints.map((point) => [
            point.category,
            String(point.agencyCount),
            `F${point.frequency_score} / P${point.proof_score} / OD${point.OD_buyer_appeal} / Fit${point.Slipstream_fit} / Diff${point.differentiation_from_cheap_SEO}`,
            point.representativeAgencies.join(", "),
            point.slipstreamMapping,
          ])}
        />
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h3>Best Fit Agency Patterns</h3>
          <span className="muted">Highest OD buyer appeal + Slipstream fit + differentiation</span>
        </div>
        <DataTable
          columns={["Agency", "Positioning", "Selling Points", "Proof", "Local", "Modern Search", "Fit"]}
          rows={topFitAgencies.map((agency) => [
            agency.name,
            agency.headlinePositioning,
            agency.topSellingPoints.join(", "),
            agency.proofUsed.join(", "),
            agency.localSeoEmphasis,
            agency.aiGeoAeoEmphasis,
            String(agency.scores.Slipstream_fit),
          ])}
        />
      </section>

      <section className="message-grid">
        <SalesMessagePanel title="Homepage Messaging" items={salesIntelligenceDataset.homepageMessaging} />
        <SalesMessagePanel title="Sales-Call Bullets" items={salesIntelligenceDataset.salesCallBullets} />
        <SalesMessagePanel title="Avoid These Generic Claims" items={salesIntelligenceDataset.avoidGenericClaims} />
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h3>Evidence Ledger</h3>
          <span className="muted">Sample of stored source snippets</span>
        </div>
        <div className="evidence-list">
          {evidenceAgencies.map((agency) => (
            <article className="evidence-card" key={agency.id}>
              <div className="panel-heading">
                <h3>{agency.name}</h3>
                <a href={agency.website} rel="noreferrer" target="_blank">
                  Website
                </a>
              </div>
              <p>{agency.headlinePositioning}</p>
              {agency.claims.slice(0, 2).map((claim) => (
                <div className="evidence-claim" key={`${agency.id}-${claim.field}-${claim.category}`}>
                  <span>{claim.category}</span>
                  <strong>{claim.claim}</strong>
                  <a href={claim.sourceUrl} rel="noreferrer" target="_blank">
                    {claim.sourceName}
                  </a>
                  <em>{claim.sourceSnippet}</em>
                </div>
              ))}
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function SalesMessagePanel({
  items,
  title,
}: {
  items: typeof salesIntelligenceDataset.homepageMessaging;
  title: string;
}) {
  return (
    <section className="panel message-panel">
      <div className="panel-heading">
        <h3>{title}</h3>
        <span className="muted">{items.length} items</span>
      </div>
      <div className="message-list">
        {items.map((item) => (
          <article className="message-card" key={item.id}>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
            <span>{item.mappedCategories.join(" / ")}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function RouteAnchor({
  children,
  className,
  onNavigate,
  route,
}: {
  children: ReactNode;
  className: string;
  onNavigate: (route: RouteKey) => void;
  route: RouteKey;
}) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }

    event.preventDefault();
    onNavigate(route);
  }

  return (
    <a className={className} href={pathForRoute(route)} onClick={handleClick}>
      {children}
    </a>
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
