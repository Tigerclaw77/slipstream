import type { Practice, TerritoryAvailability } from "../types";

export const PRESET_RADII_MILES = [0.5, 1, 2, 3, 5, 10] as const;

const EARTH_RADIUS_MILES = 3958.8;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export function haversineDistanceMiles(
  origin: Pick<Practice, "latitude" | "longitude">,
  destination: Pick<Practice, "latitude" | "longitude">,
): number {
  const latitudeDelta = toRadians(destination.latitude - origin.latitude);
  const longitudeDelta = toRadians(destination.longitude - origin.longitude);
  const originLatitude = toRadians(origin.latitude);
  const destinationLatitude = toRadians(destination.latitude);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_MILES * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getCompetitorsByDistance(practice: Practice, practices: Practice[]) {
  return practices
    .filter((candidate) => candidate.status === "competitor")
    .map((competitor) => ({
      practice: competitor,
      distanceMiles: haversineDistanceMiles(practice, competitor),
    }))
    .sort((a, b) => a.distanceMiles - b.distanceMiles);
}

export function getCompetitorCountsByRadius(practice: Practice, practices: Practice[]) {
  const competitors = getCompetitorsByDistance(practice, practices);

  return PRESET_RADII_MILES.map((radius) => ({
    radius,
    count: competitors.filter((competitor) => competitor.distanceMiles <= radius).length,
  }));
}

export function recommendTerritory(practice: Practice, practices: Practice[]) {
  const competitors = getCompetitorsByDistance(practice, practices);
  const clients = practices
    .filter((candidate) => candidate.status === "client")
    .map((client) => ({
      practice: client,
      distanceMiles: haversineDistanceMiles(practice, client),
    }))
    .sort((a, b) => a.distanceMiles - b.distanceMiles);

  const competitorsWithinTen = competitors.filter((competitor) => competitor.distanceMiles <= 10);
  const closestClient = clients[0];
  const conflictsClient = closestClient && closestClient.distanceMiles <= 3;
  const reviewClient = closestClient && closestClient.distanceMiles > 3 && closestClient.distanceMiles <= 5;
  const suggestedProtectedRadius = conflictsClient ? 1 : competitorsWithinTen.length >= 4 ? 3 : 5;
  const reviewZoneRadius = Math.max(5, suggestedProtectedRadius + 2);
  const availability: TerritoryAvailability = conflictsClient
    ? "conflicted"
    : reviewClient
      ? "review"
      : "open";

  return {
    suggestedProtectedRadius,
    competitorsBlocked: competitors.filter(
      (competitor) => competitor.distanceMiles <= suggestedProtectedRadius,
    ).length,
    reviewZoneRadius,
    availability,
    nearestClient: closestClient,
  };
}
