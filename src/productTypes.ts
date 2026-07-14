export type ReportRequestStatus =
  | "awaiting_payment"
  | "new"
  | "processing"
  | "completed"
  | "failed";

export type IntakeValues = {
  businessName: string;
  website: string;
  address: string;
  email: string;
  notes: string;
};

export type IntakeErrors = Partial<Record<keyof IntakeValues, string>>;

export type CompetitorFinding = {
  name: string;
  address: string;
  distanceMiles: number;
  website: string;
  latitude: number;
  longitude: number;
};

export type VisibilityFinding = {
  label: string;
  status: "strong" | "attention" | "missing";
  detail: string;
};

export type LocalVisibilityReport = {
  version: 1;
  generatedAt: string;
  business: {
    name: string;
    website: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  executiveSummary: string;
  opportunityScore: number;
  territoryStrength: number;
  competitionDensity: {
    label: "Low" | "Moderate" | "High";
    withinOneMile: number;
    withinThreeMiles: number;
    withinFiveMiles: number;
    withinTenMiles: number;
  };
  territory: {
    recommendedRadiusMiles: number;
    reviewRadiusMiles: number;
  };
  competitors: CompetitorFinding[];
  visibilityFindings: VisibilityFinding[];
  biggestWins: string[];
  priorityRecommendations: string[];
  roadmap: {
    doFirst: string[];
    doNext: string[];
    doLater: string[];
  };
  dataNote: string;
};

export type PublicReportRequest = {
  id: string;
  businessName: string;
  status: ReportRequestStatus;
  createdAt: string;
  completedAt: string | null;
  downloadUrl: string | null;
  message: string;
  stages: {
    paymentConfirmed: boolean;
    analysisComplete: boolean;
    pdfGenerated: boolean;
    emailDelivered: boolean;
  };
};

export type AdminReportRequest = {
  id: string;
  businessName: string;
  address: string;
  email: string;
  status: ReportRequestStatus;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  errorStage: string | null;
  analysisCompletedAt: string | null;
  pdfGeneratedAt: string | null;
  emailDeliveredAt: string | null;
};

export type PublicProductConfig = {
  priceCents: number;
  supportEmail: string;
  deliveryTimeframe: string;
};
