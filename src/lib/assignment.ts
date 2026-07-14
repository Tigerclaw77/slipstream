import {
  assignments as seedAssignments,
  practices as seedPractices,
  territories as seedTerritories,
} from "../data/seedData";
import { haversineDistanceMiles } from "./territory";
import type { Assignment, AssignmentDecision, AuthorityAsset, Practice, Territory } from "../types";

type AssignmentContext = {
  practices?: Practice[];
  territories?: Territory[];
  assignments?: Assignment[];
};

export function canAssignAsset(
  practice: Practice,
  asset: AuthorityAsset,
  context: AssignmentContext = {},
): AssignmentDecision {
  const practices = context.practices ?? seedPractices;
  const territories = context.territories ?? seedTerritories;
  const assignments = context.assignments ?? seedAssignments;

  const activeAssignmentsForAsset = assignments.filter(
    (assignment) =>
      assignment.authority_asset_id === asset.id &&
      assignment.practice_id !== practice.id &&
      assignment.status === "active",
  );

  const nearbyClients = activeAssignmentsForAsset
    .map((assignment) => {
      const client = practices.find(
        (candidate) => candidate.id === assignment.practice_id && candidate.status === "client",
      );
      const territory = territories.find((candidate) => candidate.practice_id === assignment.practice_id);

      if (!client || !territory) {
        return undefined;
      }

      return {
        practice: client,
        distanceMiles: haversineDistanceMiles(practice, client),
        protectedRadiusMiles: territory.radius_miles,
        reviewZoneMiles: territory.review_radius_miles,
      };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
    .sort((a, b) => a.distanceMiles - b.distanceMiles);

  const protectedConflict = nearbyClients.find(
    (client) => client.distanceMiles <= client.protectedRadiusMiles,
  );

  if (protectedConflict) {
    return {
      status: "blocked",
      reason: "A nearby client already has this Authority Asset inside the Protected Radius.",
      nearestConflict: protectedConflict,
    };
  }

  const reviewConflict = nearbyClients.find((client) => client.distanceMiles <= client.reviewZoneMiles);

  if (reviewConflict) {
    return {
      status: "review",
      reason: "A nearby client has this Authority Asset inside the Review Zone.",
      nearestConflict: reviewConflict,
    };
  }

  return {
    status: "allow",
    reason: "No client with this Authority Asset is inside a Protected Radius or Review Zone.",
  };
}
