import { haversineDistanceMiles } from "./territory";

export type ProspectCoordinates = {
  latitude: number;
  longitude: number;
};

export type RealCompetitor = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceMiles: number;
  website?: string;
  rating?: number;
  reviewCount?: number;
};

export type DiscoveryResult = {
  prospectCoordinates: ProspectCoordinates;
  competitors: RealCompetitor[];
  dataSource: string;
};

type NominatimResult = {
  lat: string;
  lon: string;
};

type NominatimPlace = NominatimResult & {
  osm_type?: string;
  osm_id?: number;
  category?: string;
  type?: string;
  name?: string;
  display_name?: string;
  address?: Record<string, string>;
  extratags?: Record<string, string>;
};

type OverpassElement = {
  id: number;
  type: "node" | "way" | "relation";
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements?: OverpassElement[];
};

const DISCOVERY_RADIUS_METERS = 16093;
const DISCOVERY_RADIUS_MILES = 10;
const FALLBACK_SEARCH_TERMS = ["optical", "vision", "eye care"];
const OVERPASS_ENDPOINTS = ["/api/overpass-de/api/interpreter", "/api/overpass-kumi/api/interpreter"];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildAddress(tags: Record<string, string>) {
  const streetAddress = [tags["addr:housenumber"], tags["addr:street"]]
    .filter(Boolean)
    .join(" ");
  const locality = [tags["addr:city"], tags["addr:state"], tags["addr:postcode"]]
    .filter(Boolean)
    .join(", ");
  const structuredAddress = [streetAddress, locality].filter(Boolean).join(", ");

  return tags["addr:full"] || structuredAddress || "Address unavailable in OpenStreetMap";
}

function buildNominatimAddress(place: NominatimPlace) {
  const address = place.address ?? {};
  const streetAddress = [address.house_number, address.road].filter(Boolean).join(" ");
  const locality = [
    address.city || address.town || address.village || address.suburb,
    address.state,
    address.postcode,
  ]
    .filter(Boolean)
    .join(", ");
  const structuredAddress = [streetAddress, locality].filter(Boolean).join(", ");

  return structuredAddress || place.display_name || "Address unavailable in OpenStreetMap";
}

function getElementCoordinates(element: OverpassElement) {
  if (typeof element.lat === "number" && typeof element.lon === "number") {
    return {
      latitude: element.lat,
      longitude: element.lon,
    };
  }

  if (element.center) {
    return {
      latitude: element.center.lat,
      longitude: element.center.lon,
    };
  }

  return undefined;
}

async function geocodeAddress(address: string): Promise<ProspectCoordinates> {
  const searchParams = new URLSearchParams({
    format: "jsonv2",
    q: address,
    limit: "1",
    countrycodes: "us",
    addressdetails: "1",
  });
  const response = await fetch(`/api/nominatim/search?${searchParams}`);

  if (!response.ok) {
    throw new Error(`Geocoding failed with status ${response.status}.`);
  }

  const results = (await response.json()) as NominatimResult[];
  const firstResult = results[0];

  if (!firstResult) {
    throw new Error("No geocoding result found for that address.");
  }

  const latitude = Number(firstResult.lat);
  const longitude = Number(firstResult.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Geocoding returned invalid coordinates.");
  }

  return { latitude, longitude };
}

async function fetchNearbyOptometryPlaces({
  latitude,
  longitude,
}: ProspectCoordinates): Promise<OverpassElement[]> {
  const query = `
    [out:json][timeout:25];
    (
      node(around:${DISCOVERY_RADIUS_METERS},${latitude},${longitude})["healthcare"="optometrist"];
      way(around:${DISCOVERY_RADIUS_METERS},${latitude},${longitude})["healthcare"="optometrist"];
      relation(around:${DISCOVERY_RADIUS_METERS},${latitude},${longitude})["healthcare"="optometrist"];
      node(around:${DISCOVERY_RADIUS_METERS},${latitude},${longitude})["shop"="optician"];
      way(around:${DISCOVERY_RADIUS_METERS},${latitude},${longitude})["shop"="optician"];
      relation(around:${DISCOVERY_RADIUS_METERS},${latitude},${longitude})["shop"="optician"];
      node(around:${DISCOVERY_RADIUS_METERS},${latitude},${longitude})["healthcare:speciality"~"optometry|optometrist|ophthalmology",i];
      way(around:${DISCOVERY_RADIUS_METERS},${latitude},${longitude})["healthcare:speciality"~"optometry|optometrist|ophthalmology",i];
      relation(around:${DISCOVERY_RADIUS_METERS},${latitude},${longitude})["healthcare:speciality"~"optometry|optometrist|ophthalmology",i];
      node(around:${DISCOVERY_RADIUS_METERS},${latitude},${longitude})["name"~"optical|vision|eye care|eye center|optometry|optometrist",i];
      way(around:${DISCOVERY_RADIUS_METERS},${latitude},${longitude})["name"~"optical|vision|eye care|eye center|optometry|optometrist",i];
      relation(around:${DISCOVERY_RADIUS_METERS},${latitude},${longitude})["name"~"optical|vision|eye care|eye center|optometry|optometrist",i];
    );
    out center tags;
  `;
  const errors: string[] = [];

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: new URLSearchParams({ data: query }),
      });

      if (!response.ok) {
        errors.push(`${endpoint} returned ${response.status}`);
        continue;
      }

      const result = (await response.json()) as OverpassResponse;

      return result.elements ?? [];
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `${endpoint} failed`);
    }
  }

  throw new Error(`Overpass competitor discovery failed. ${errors.join(" ")}`);
}

function isOptometryRelatedPlace({
  category,
  name,
  type,
}: {
  category?: string;
  name: string;
  type?: string;
}) {
  const normalizedName = normalizeText(name);
  const categoryType = normalizeText(`${category ?? ""} ${type ?? ""}`);
  const isExplicitOptometryCategory =
    categoryType.includes("shop optician") ||
    categoryType.includes("healthcare optometrist") ||
    categoryType.includes("optometrist");
  const hasOptometryName =
    normalizedName.includes("optical") ||
    normalizedName.includes("optometry") ||
    normalizedName.includes("optometrist") ||
    normalizedName.includes("eye care") ||
    normalizedName.includes("eye center") ||
    normalizedName.includes("eyedoc") ||
    (normalizedName.includes("vision") &&
      (categoryType.includes("shop") || categoryType.includes("healthcare")));

  return isExplicitOptometryCategory || hasOptometryName;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, milliseconds);
  });
}

async function fetchNearbyNominatimPlaces({
  latitude,
  longitude,
}: ProspectCoordinates): Promise<NominatimPlace[]> {
  const latitudeDelta = DISCOVERY_RADIUS_MILES / 69;
  const longitudeDelta =
    DISCOVERY_RADIUS_MILES / (69 * Math.cos((latitude * Math.PI) / 180));
  const west = longitude - longitudeDelta;
  const east = longitude + longitudeDelta;
  const north = latitude + latitudeDelta;
  const south = latitude - latitudeDelta;
  const places: NominatimPlace[] = [];

  for (const [index, term] of FALLBACK_SEARCH_TERMS.entries()) {
    if (index > 0) {
      await wait(1000);
    }

    const searchParams = new URLSearchParams({
      addressdetails: "1",
      bounded: "1",
      countrycodes: "us",
      extratags: "1",
      format: "jsonv2",
      limit: "30",
      q: term,
      viewbox: `${west},${north},${east},${south}`,
    });
    const response = await fetch(`/api/nominatim/search?${searchParams}`);

    if (!response.ok) {
      throw new Error(`Nominatim competitor search failed with status ${response.status}.`);
    }

    places.push(...((await response.json()) as NominatimPlace[]));
  }

  return places;
}

export async function discoverRealCompetitors(
  practiceName: string,
  address: string,
): Promise<DiscoveryResult> {
  if (!address.trim()) {
    throw new Error("Address is required before running analysis.");
  }

  const prospectCoordinates = await geocodeAddress(address.trim());
  let elements: OverpassElement[] = [];
  let places: NominatimPlace[] = [];
  const sourceParts = ["OpenStreetMap Nominatim geocoding"];

  try {
    elements = await fetchNearbyOptometryPlaces(prospectCoordinates);

    if (elements.length > 0) {
      sourceParts.push("OpenStreetMap Overpass competitor search");
    }
  } catch {
    elements = [];
  }

  if (elements.length === 0) {
    places = await fetchNearbyNominatimPlaces(prospectCoordinates);
    sourceParts.push("OpenStreetMap Nominatim bounded competitor search");
  }

  const normalizedPracticeName = normalizeText(practiceName);
  const competitorsByKey = new Map<string, RealCompetitor>();

  for (const element of elements) {
    const tags = element.tags ?? {};
    const name = tags.name?.trim();
    const coordinates = getElementCoordinates(element);

    if (!name || !coordinates) {
      continue;
    }

    const distanceMiles = haversineDistanceMiles(prospectCoordinates, coordinates);
    const normalizedCompetitorName = normalizeText(name);

    if (normalizedPracticeName && normalizedCompetitorName === normalizedPracticeName && distanceMiles <= 0.1) {
      continue;
    }

    const key = `${normalizedCompetitorName}-${coordinates.latitude.toFixed(5)}-${coordinates.longitude.toFixed(5)}`;

    if (competitorsByKey.has(key)) {
      continue;
    }

    competitorsByKey.set(key, {
      id: `${element.type}-${element.id}`,
      name,
      address: buildAddress(tags),
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      distanceMiles,
      website: tags.website || tags["contact:website"],
    });
  }

  for (const place of places) {
    const name = place.name?.trim();

    if (!name || !isOptometryRelatedPlace({ category: place.category, name, type: place.type })) {
      continue;
    }

    const latitude = Number(place.lat);
    const longitude = Number(place.lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      continue;
    }

    const distanceMiles = haversineDistanceMiles(prospectCoordinates, { latitude, longitude });
    const normalizedCompetitorName = normalizeText(name);

    if (normalizedPracticeName && normalizedCompetitorName === normalizedPracticeName && distanceMiles <= 0.1) {
      continue;
    }

    const key = `${normalizedCompetitorName}-${latitude.toFixed(5)}-${longitude.toFixed(5)}`;

    if (competitorsByKey.has(key)) {
      continue;
    }

    competitorsByKey.set(key, {
      id: `${place.osm_type ?? "place"}-${place.osm_id ?? key}`,
      name,
      address: buildNominatimAddress(place),
      latitude,
      longitude,
      distanceMiles,
      website: place.extratags?.website || place.extratags?.["contact:website"],
    });
  }

  return {
    prospectCoordinates,
    competitors: Array.from(competitorsByKey.values()).sort(
      (a, b) => a.distanceMiles - b.distanceMiles,
    ),
    dataSource: sourceParts.join(" + "),
  };
}
