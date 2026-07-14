export type PracticeStatus = "prospect" | "client" | "competitor" | "blocked";

export type TerritoryAvailability = "open" | "review" | "conflicted";

export type AssignmentStatus = "allow" | "review" | "blocked" | "active";

export type Practice = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
  website: string;
  practice_type: string;
  status: PracticeStatus;
  tier: string;
};

export type Territory = {
  id: string;
  practice_id: string;
  radius_miles: number;
  review_radius_miles: number;
  status: TerritoryAvailability;
  notes: string;
};

export type TopicCluster = {
  id: string;
  name: string;
  category: string;
};

export type AuthorityAsset = {
  id: string;
  topic_cluster_id: string;
  title: string;
  slug: string;
  intent: string;
  audience: string;
  status: string;
};

export type Assignment = {
  id: string;
  practice_id: string;
  authority_asset_id: string;
  status: AssignmentStatus;
  assigned_at: string;
};

export type AssignmentDecision = {
  status: Exclude<AssignmentStatus, "active">;
  reason: string;
  nearestConflict?: {
    practice: Practice;
    distanceMiles: number;
    protectedRadiusMiles: number;
    reviewZoneMiles: number;
  };
};

export type KnowledgeCitation = {
  label: string;
  url: string;
  sourceType?: "guideline" | "study" | "manufacturer" | "insurer" | "internal";
};

export type KnowledgeCitationPlaceholder = {
  status: "placeholder";
  note: string;
};

export type KnowledgeQuestion = {
  id: string;
  slug: string;
  topic: string;
  category: string;
  question: string;
  shortAnswer: string;
  longAnswer: string;
  relatedQuestions: string[];
  tags: string[];
  citations: KnowledgeCitation[];
  lastUpdated: string;
  parentTopicSlug: string;
  parentCategorySlug: string;
  relatedCategorySlugs: string[];
};

export type KnowledgePilotQuestion = Omit<KnowledgeQuestion, "citations"> & {
  citations: KnowledgeCitationPlaceholder[];
};

export type KnowledgeSchemaType = "faq" | "qa" | "breadcrumb" | "article" | "itemlist";

export type KnowledgeSchemaDraft = {
  type: KnowledgeSchemaType;
  status: "draft";
  itemCount: number;
  payload: Record<string, unknown>;
};

export type KnowledgePilotValidation = {
  questionCount: number;
  totalWordCount: number;
  averageAnswerLength: number;
  internalLinksCreated: number;
  relatedQuestionLinks: number;
  schemaCoveragePercent: number;
};

export type KnowledgePilotHub = {
  id: string;
  route: string;
  title: string;
  topicSlug: string;
  topicName: string;
  categorySlug: string;
  categoryName: string;
  overview: string;
  questions: KnowledgePilotQuestion[];
  relatedCategorySlugs: string[];
};

export type KnowledgePilotHubMetrics = {
  hubId: string;
  title: string;
  route: string;
  questionCount: number;
  totalWordCount: number;
  internalLinksCreated: number;
  relatedQuestionLinks: number;
  averageAnswerLength: number;
};

export type KnowledgeOverlapFlag = {
  type: "duplicated concepts" | "duplicated answers" | "duplicated phrasing" | "weak differentiation";
  severity: "low" | "medium" | "high";
  label: string;
  detail: string;
  hubs: string[];
};

export type AuthorityExperimentVariant = "A" | "B";

export type AuthorityExperimentStatus =
  | "Not Indexed"
  | "Indexed"
  | "Receiving Impressions"
  | "Receiving Clicks";

export type AuthorityExperimentAnalytics = {
  indexedPages: number;
  impressions: number;
  clicks: number;
  averagePosition: number | null;
};

export type AuthorityExperimentPage = {
  experimentId: string;
  questionId: string;
  variant: AuthorityExperimentVariant;
  variantLabel: "Machine-Generated" | "OD-Reviewed";
  route: string;
  createdAt: string;
  question: string;
  slug: string;
  topic: string;
  topicSlug: string;
  category: string;
  categorySlug: string;
  shortAnswer: string;
  longAnswer: string;
  relatedQuestions: string[];
  tags: string[];
  citations: KnowledgeCitationPlaceholder[];
  analytics: AuthorityExperimentAnalytics;
};

export type AuthorityExperimentPair = {
  experimentId: string;
  questionId: string;
  slug: string;
  question: string;
  intent: string;
  status: AuthorityExperimentStatus;
  variantA: AuthorityExperimentPage;
  variantB: AuthorityExperimentPage;
};

export type AuthorityExperimentPageMetrics = {
  route: string;
  wordCount: number;
  internalLinks: number;
  relatedLinks: number;
  schemaCoveragePercent: number;
};

export type AuthorityExperimentDashboardMetrics = {
  experimentId: string;
  pageCount: number;
  variantACount: number;
  variantBCount: number;
  indexedPages: number;
  impressions: number;
  clicks: number;
  ctr: number;
  averagePosition: number | null;
};

export type ArchitectureExperimentVariant = "traditional" | "se20";

export type ArchitectureExperimentSection = {
  heading: "Introduction" | "Benefits" | "Drawbacks" | "Conclusion";
  body: string;
};

export type ArchitectureExperimentQuestion = {
  id: string;
  question: string;
  answer: string;
  relatedQuestionIds: string[];
  entityReferences: string[];
};

export type ArchitectureExperimentTraditionalPage = {
  experimentId: string;
  topicId: string;
  variant: "traditional";
  route: string;
  slug: string;
  title: string;
  topic: string;
  topicSlug: string;
  category: string;
  categorySlug: string;
  sections: ArchitectureExperimentSection[];
  internalLinks: string[];
  entityReferences: string[];
  schemaTypes: string[];
};

export type ArchitectureExperimentSe20Page = {
  experimentId: string;
  topicId: string;
  variant: "se20";
  route: string;
  slug: string;
  title: string;
  topic: string;
  topicSlug: string;
  category: string;
  categorySlug: string;
  primaryQuestionId: string;
  questions: ArchitectureExperimentQuestion[];
  crossLinks: string[];
  relatedCategories: string[];
  entityRelationships: Array<{
    entity: string;
    relationship: string;
  }>;
  schemaTypes: string[];
};

export type ArchitectureExperimentPair = {
  experimentId: string;
  topicId: string;
  slug: string;
  topic: string;
  traditional: ArchitectureExperimentTraditionalPage;
  se20: ArchitectureExperimentSe20Page;
};

export type ArchitectureExperimentPage =
  | ArchitectureExperimentTraditionalPage
  | ArchitectureExperimentSe20Page;

export type ArchitectureExperimentMetrics = {
  route: string;
  variant: ArchitectureExperimentVariant;
  wordCount: number;
  internalLinks: number;
  relatedQuestionLinks: number;
  entityReferences: number;
  schemaTypes: number;
  questionCount: number;
};

export type KnowledgeQuestionInventoryCategory = {
  topicSlug: string;
  topicName: string;
  categorySlug: string;
  categoryName: string;
  questions: string[];
};

export type KnowledgeQuestionInventoryCluster = {
  topicSlug: string;
  topicName: string;
  targetQuestionCount: number;
  categories: KnowledgeQuestionInventoryCategory[];
};

export type KnowledgeInventoryStats = {
  totalQuestions: number;
  duplicateCount: number;
  byCluster: Array<{
    topicSlug: string;
    topicName: string;
    targetQuestionCount: number;
    questionCount: number;
    coveragePercent: number;
  }>;
  byCategory: Array<{
    topicSlug: string;
    topicName: string;
    categorySlug: string;
    categoryName: string;
    questionCount: number;
  }>;
};

export type KnowledgeCategory = {
  id: string;
  slug: string;
  name: string;
  parentTopicSlug: string;
};

export type KnowledgeTopicCluster = {
  id: string;
  slug: string;
  name: string;
  overview: string;
  targetQuestionCount: number;
  categories: KnowledgeCategory[];
  exampleQuestions: string[];
  relatedClusterSlugs: string[];
};

export type KnowledgeIndustry = {
  id: string;
  slug: string;
  name: string;
  activeVertical: string;
  rootTitle: string;
  topicClusters: KnowledgeTopicCluster[];
  questions: KnowledgeQuestion[];
};

export type SalesClaimCategory =
  | "leads/revenue"
  | "rankings"
  | "Google Maps/local pack"
  | "content authority"
  | "technical SEO"
  | "backlinks"
  | "reporting/transparency"
  | "industry specialization"
  | "AI search/GEO/AEO"
  | "reputation/reviews"
  | "conversion optimization";

export type SalesProofType =
  | "reviews"
  | "case studies"
  | "rankings"
  | "awards"
  | "metrics"
  | "client logos";

export type SalesEmphasisLevel = "low" | "medium" | "high";

export type SalesSourceReference = {
  name: string;
  url: string;
  rank?: number | string;
  snippet: string;
};

export type SalesClaim = {
  field:
    | "headline positioning"
    | "top selling points"
    | "proof used"
    | "target customer type"
    | "local SEO emphasis"
    | "AI/GEO/AEO emphasis";
  category: SalesClaimCategory;
  claim: string;
  sourceName: string;
  sourceUrl: string;
  sourceSnippet: string;
};

export type SalesIntelligenceScores = {
  frequency_score: number;
  proof_score: number;
  OD_buyer_appeal: number;
  Slipstream_fit: number;
  differentiation_from_cheap_SEO: number;
};

export type SalesIntelligenceAgency = {
  id: string;
  name: string;
  website: string;
  sourceRankingPage: SalesSourceReference;
  headlinePositioning: string;
  topSellingPoints: SalesClaimCategory[];
  proofUsed: SalesProofType[];
  targetCustomerType: string;
  localSeoEmphasis: SalesEmphasisLevel;
  aiGeoAeoEmphasis: SalesEmphasisLevel;
  scores: SalesIntelligenceScores;
  claims: SalesClaim[];
};

export type SalesMessageRecommendation = {
  id: string;
  title: string;
  body: string;
  mappedCategories: SalesClaimCategory[];
};

export type SalesIntelligenceDataset = {
  metadata: {
    module: "sales-intelligence";
    lastUpdated: string;
    agencyCount: number;
    sourcePages: SalesSourceReference[];
  };
  agencies: SalesIntelligenceAgency[];
  homepageMessaging: SalesMessageRecommendation[];
  salesCallBullets: SalesMessageRecommendation[];
  avoidGenericClaims: SalesMessageRecommendation[];
};

export type SalesSellingPointSummary = {
  category: SalesClaimCategory;
  agencyCount: number;
  frequency_score: number;
  proof_score: number;
  OD_buyer_appeal: number;
  Slipstream_fit: number;
  differentiation_from_cheap_SEO: number;
  representativeAgencies: string[];
  slipstreamMapping: string;
};
