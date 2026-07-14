import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const sourcePath = join(projectRoot, "src", "data", "salesIntelligence.agencies.json");
const outputDir = join(projectRoot, "data", "internal-exports", "sales-intelligence");

const dataset = JSON.parse(await readFile(sourcePath, "utf8"));

const categories = [
  "leads/revenue",
  "rankings",
  "Google Maps/local pack",
  "content authority",
  "technical SEO",
  "backlinks",
  "reporting/transparency",
  "industry specialization",
  "AI search/GEO/AEO",
  "reputation/reviews",
  "conversion optimization",
];

const odBuyerAppealByCategory = {
  "leads/revenue": 5,
  rankings: 3,
  "Google Maps/local pack": 5,
  "content authority": 4,
  "technical SEO": 3,
  backlinks: 2,
  "reporting/transparency": 5,
  "industry specialization": 5,
  "AI search/GEO/AEO": 3,
  "reputation/reviews": 5,
  "conversion optimization": 4,
};

const slipstreamFitByCategory = {
  "leads/revenue": 4,
  rankings: 3,
  "Google Maps/local pack": 5,
  "content authority": 5,
  "technical SEO": 3,
  backlinks: 2,
  "reporting/transparency": 5,
  "industry specialization": 5,
  "AI search/GEO/AEO": 3,
  "reputation/reviews": 4,
  "conversion optimization": 3,
};

const differentiationByCategory = {
  "leads/revenue": 2,
  rankings: 1,
  "Google Maps/local pack": 4,
  "content authority": 4,
  "technical SEO": 2,
  backlinks: 2,
  "reporting/transparency": 3,
  "industry specialization": 5,
  "AI search/GEO/AEO": 3,
  "reputation/reviews": 3,
  "conversion optimization": 3,
};

const slipstreamMappingByCategory = {
  "leads/revenue": "Translate revenue promises into patient-intent territory demand and sales-call proof.",
  rankings: "Use cautiously: frame as market position and authority coverage, not rank guarantees.",
  "Google Maps/local pack": "Make Protected Radius, Review Zone, and named nearby competitors the core proof.",
  "content authority": "Map to Authority Assets, topic clusters, and optometry question hubs.",
  "technical SEO": "Keep as table stakes; do not lead with audits unless tied to local visibility readiness.",
  backlinks: "Treat as authority support, not the product promise.",
  "reporting/transparency": "Show diagnostics, data sources, territory status, and assignment rules.",
  "industry specialization": "Lead with optometry-specific questions, payer topics, services, and local competitors.",
  "AI search/GEO/AEO": "Mention only as modern search readiness backed by structured authority coverage.",
  "reputation/reviews": "Connect to Review Zone, Google Business Profile pressure, and competitor proof.",
  "conversion optimization": "Support the sales story with calls, booking actions, and landing page readiness.",
};

function frequencyScore(count, total) {
  const share = count / total;
  if (share >= 0.6) return 5;
  if (share >= 0.4) return 4;
  if (share >= 0.25) return 3;
  if (share >= 0.12) return 2;
  return 1;
}

function average(values) {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function csvEscape(value) {
  const stringValue = String(value ?? "");
  return `"${stringValue.replaceAll('"', '""')}"`;
}

const agencies = dataset.agencies;

const sellingPoints = categories
  .map((category) => {
    const categoryAgencies = agencies.filter((agency) => agency.topSellingPoints.includes(category));
    return {
      category,
      agencyCount: categoryAgencies.length,
      frequency_score: frequencyScore(categoryAgencies.length, agencies.length),
      proof_score: Math.round(average(categoryAgencies.map((agency) => agency.scores.proof_score))) || 1,
      OD_buyer_appeal: odBuyerAppealByCategory[category],
      Slipstream_fit: slipstreamFitByCategory[category],
      differentiation_from_cheap_SEO: differentiationByCategory[category],
      representativeAgencies: categoryAgencies.slice(0, 5).map((agency) => agency.name),
      slipstreamMapping: slipstreamMappingByCategory[category],
    };
  })
  .sort((left, right) => {
    const leftScore =
      left.frequency_score +
      left.proof_score +
      left.OD_buyer_appeal +
      left.Slipstream_fit +
      left.differentiation_from_cheap_SEO;
    const rightScore =
      right.frequency_score +
      right.proof_score +
      right.OD_buyer_appeal +
      right.Slipstream_fit +
      right.differentiation_from_cheap_SEO;
    return rightScore - leftScore;
  });

const agencyRows = agencies.map((agency) => ({
  id: agency.id,
  name: agency.name,
  website: agency.website,
  source_name: agency.sourceRankingPage.name,
  source_url: agency.sourceRankingPage.url,
  source_rank: agency.sourceRankingPage.rank ?? "",
  headline_positioning: agency.headlinePositioning,
  top_selling_points: agency.topSellingPoints.join("; "),
  proof_used: agency.proofUsed.join("; "),
  target_customer_type: agency.targetCustomerType,
  local_seo_emphasis: agency.localSeoEmphasis,
  ai_geo_aeo_emphasis: agency.aiGeoAeoEmphasis,
  frequency_score: agency.scores.frequency_score,
  proof_score: agency.scores.proof_score,
  OD_buyer_appeal: agency.scores.OD_buyer_appeal,
  Slipstream_fit: agency.scores.Slipstream_fit,
  differentiation_from_cheap_SEO: agency.scores.differentiation_from_cheap_SEO,
  claim_sources: agency.claims.map((claim) => `${claim.sourceName}: ${claim.sourceSnippet}`).join(" | "),
}));

const csvColumns = Object.keys(agencyRows[0]);
const csv = [
  csvColumns.map(csvEscape).join(","),
  ...agencyRows.map((row) => csvColumns.map((column) => csvEscape(row[column])).join(",")),
].join("\n");

await mkdir(outputDir, { recursive: true });
await writeFile(join(outputDir, "agencies.json"), JSON.stringify(dataset, null, 2), "utf8");
await writeFile(join(outputDir, "agencies.csv"), `${csv}\n`, "utf8");
await writeFile(join(outputDir, "selling-points.json"), JSON.stringify(sellingPoints, null, 2), "utf8");

console.log(`Exported ${agencies.length} agencies and ${sellingPoints.length} selling-point summaries.`);
