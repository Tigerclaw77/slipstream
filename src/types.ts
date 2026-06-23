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
