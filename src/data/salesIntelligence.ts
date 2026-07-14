import dataset from "./salesIntelligence.agencies.json";
import type {
  SalesClaimCategory,
  SalesIntelligenceAgency,
  SalesIntelligenceDataset,
  SalesSellingPointSummary,
} from "../types";

export const salesClaimCategories: SalesClaimCategory[] = [
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

export const salesIntelligenceDataset = dataset as SalesIntelligenceDataset;

const odBuyerAppealByCategory: Record<SalesClaimCategory, number> = {
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

const slipstreamFitByCategory: Record<SalesClaimCategory, number> = {
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

const differentiationByCategory: Record<SalesClaimCategory, number> = {
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

const slipstreamMappingByCategory: Record<SalesClaimCategory, string> = {
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

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function frequencyScore(count: number, total: number) {
  const share = count / total;

  if (share >= 0.6) {
    return 5;
  }

  if (share >= 0.4) {
    return 4;
  }

  if (share >= 0.25) {
    return 3;
  }

  if (share >= 0.12) {
    return 2;
  }

  return 1;
}

export function getSalesIntelligenceMetrics() {
  const agencies = salesIntelligenceDataset.agencies;
  const claimCount = agencies.reduce((total, agency) => total + agency.claims.length, 0);
  const highLocalCount = agencies.filter((agency) => agency.localSeoEmphasis === "high").length;
  const highAiCount = agencies.filter((agency) => agency.aiGeoAeoEmphasis === "high").length;
  const sourceCount = new Set(agencies.map((agency) => agency.sourceRankingPage.name)).size;

  return {
    agencyCount: agencies.length,
    claimCount,
    sourceCount,
    highLocalCount,
    highAiCount,
  };
}

export function getStrongestSellingPoints(): SalesSellingPointSummary[] {
  const agencies = salesIntelligenceDataset.agencies;

  return salesClaimCategories
    .map((category) => {
      const categoryAgencies = agencies.filter((agency) =>
        agency.topSellingPoints.includes(category),
      );
      const proofScore = Math.round(
        average(categoryAgencies.map((agency) => agency.scores.proof_score)),
      );

      return {
        category,
        agencyCount: categoryAgencies.length,
        frequency_score: frequencyScore(categoryAgencies.length, agencies.length),
        proof_score: proofScore || 1,
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
}

export function getTopAgenciesBySlipstreamFit(limit = 12): SalesIntelligenceAgency[] {
  return [...salesIntelligenceDataset.agencies]
    .sort((left, right) => {
      const leftScore =
        left.scores.Slipstream_fit +
        left.scores.OD_buyer_appeal +
        left.scores.differentiation_from_cheap_SEO;
      const rightScore =
        right.scores.Slipstream_fit +
        right.scores.OD_buyer_appeal +
        right.scores.differentiation_from_cheap_SEO;

      return rightScore - leftScore;
    })
    .slice(0, limit);
}
