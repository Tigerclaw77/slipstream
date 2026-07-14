import dns from "node:dns/promises";
import net from "node:net";
import type { LocalVisibilityReport, VisibilityFinding } from "../src/productTypes.js";
import type { Practice } from "../src/types.js";
import { practices as seedPractices } from "../src/data/seedData.js";
import {
  getCompetitorCountsByRadius,
  getCompetitorsByDistance,
  recommendTerritory,
} from "../src/lib/territory.js";
import { config } from "./config.js";
import type { ReportRequestRecord } from "./db.js";

type GeocodedBusiness = {
  latitude: number;
  longitude: number;
  displayName: string;
};

type WebsiteSignals = {
  reachable: boolean;
  https: boolean;
  title: boolean;
  description: boolean;
  heading: boolean;
  localSchema: boolean;
  locationMention: boolean;
};

type OsmElement = {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isPrivateIp(address: string) {
  if (address === "::1" || address.startsWith("fe80:") || address.startsWith("fc") || address.startsWith("fd")) {
    return true;
  }
  if (net.isIPv4(address)) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a === 0
    );
  }
  return false;
}

async function assertPublicUrl(url: URL) {
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Unsupported website protocol.");
  if (url.hostname === "localhost" || url.hostname.endsWith(".local")) throw new Error("Private website host.");
  const addresses = await dns.lookup(url.hostname, { all: true });
  if (addresses.length === 0 || addresses.some((item) => isPrivateIp(item.address))) {
    throw new Error("Private website address.");
  }
}

async function fetchPublicWebsite(urlString: string, redirects = 0): Promise<string> {
  const url = new URL(urlString);
  await assertPublicUrl(url);
  const response = await fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(9000),
    headers: { "user-agent": config.osmUserAgent, accept: "text/html,application/xhtml+xml" },
  });

  if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
    if (redirects >= 3) throw new Error("Too many website redirects.");
    const nextUrl = new URL(response.headers.get("location")!, url);
    return fetchPublicWebsite(nextUrl.toString(), redirects + 1);
  }

  if (!response.ok) throw new Error(`Website returned ${response.status}.`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) throw new Error("Website did not return HTML.");
  return (await response.text()).slice(0, 1_500_000);
}

async function analyzeWebsite(website: string, address: string): Promise<WebsiteSignals> {
  const base: WebsiteSignals = {
    reachable: false,
    https: website.startsWith("https://"),
    title: false,
    description: false,
    heading: false,
    localSchema: false,
    locationMention: false,
  };
  if (!website) return base;

  try {
    const html = await fetchPublicWebsite(website);
    const cityOrZip = address
      .split(",")
      .map((part) => part.trim().toLowerCase())
      .filter((part) => part.length >= 3)
      .slice(-2);
    return {
      reachable: true,
      https: base.https,
      title: /<title[^>]*>\s*[^<]{8,}\s*<\/title>/i.test(html),
      description: /<meta[^>]+name=["']description["'][^>]+content=["'][^"']{40,}/i.test(html) ||
        /<meta[^>]+content=["'][^"']{40,}["'][^>]+name=["']description["']/i.test(html),
      heading: /<h1[^>]*>\s*[\s\S]{4,}?<\/h1>/i.test(html),
      localSchema: /"@type"\s*:\s*"(?:LocalBusiness|MedicalBusiness|Optician|Dentist|Physician)"/i.test(html),
      locationMention: cityOrZip.some((part) => html.toLowerCase().includes(part)),
    };
  } catch {
    return base;
  }
}

async function geocodeBusiness(request: ReportRequestRecord): Promise<GeocodedBusiness> {
  if (config.analysisMode === "sample") {
    const sample = seedPractices[0];
    return { latitude: sample.latitude, longitude: sample.longitude, displayName: request.address };
  }

  const queries = [`${request.business_name}, ${request.address}`, request.address];
  for (const query of queries) {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { "user-agent": config.osmUserAgent, accept: "application/json" },
    });
    if (!response.ok) continue;
    const results = (await response.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (results[0]) {
      return {
        latitude: Number(results[0].lat),
        longitude: Number(results[0].lon),
        displayName: results[0].display_name,
      };
    }
  }

  throw new Error("We could not locate this business address. Confirm the full address and regenerate the report.");
}

function addressFromTags(tags: Record<string, string>) {
  const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
  const locality = [tags["addr:city"], tags["addr:state"], tags["addr:postcode"]].filter(Boolean).join(", ");
  return [street, locality].filter(Boolean).join(", ") || "Address not listed in OpenStreetMap";
}

async function findCompetitors(
  business: GeocodedBusiness,
  businessName: string,
): Promise<Practice[]> {
  if (config.analysisMode === "sample") {
    return seedPractices.filter((practice) => practice.status === "competitor");
  }

  const query = `[out:json][timeout:25];(
    nwr(around:16094,${business.latitude},${business.longitude})["healthcare"="optometrist"];
    nwr(around:16094,${business.latitude},${business.longitude})["shop"="optician"];
    nwr(around:16094,${business.latitude},${business.longitude})["healthcare:speciality"~"optometry|ophthalmology",i];
  );out center tags;`;
  let payload: { elements: OsmElement[] } | null = null;
  const failures: string[] = [];
  for (const endpoint of config.overpassEndpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        signal: AbortSignal.timeout(45000),
        headers: {
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
          "user-agent": config.osmUserAgent,
        },
        body: new URLSearchParams({ data: query }),
      });
      if (!response.ok) {
        failures.push(`${new URL(endpoint).hostname}: ${response.status}`);
        continue;
      }
      payload = (await response.json()) as { elements: OsmElement[] };
      break;
    } catch (error) {
      failures.push(`${new URL(endpoint).hostname}: ${error instanceof Error ? error.message : "request failed"}`);
    }
  }
  if (!payload) {
    throw new Error(`Competitor map services were unavailable (${failures.join("; ")}). Regenerate the report shortly.`);
  }
  const ownName = normalizeName(businessName);
  const seen = new Set<string>();

  return payload.elements.flatMap((element, index) => {
    const tags = element.tags ?? {};
    const name = tags.name?.trim();
    const latitude = element.lat ?? element.center?.lat;
    const longitude = element.lon ?? element.center?.lon;
    if (!name || latitude === undefined || longitude === undefined) return [];
    const normalized = normalizeName(name);
    if (!normalized || normalized === ownName || seen.has(normalized)) return [];
    seen.add(normalized);
    return [{
      id: `osm-${element.id}-${index}`,
      name,
      address: addressFromTags(tags),
      city: tags["addr:city"] ?? "",
      state: tags["addr:state"] ?? "",
      zip: tags["addr:postcode"] ?? "",
      latitude,
      longitude,
      website: tags.website ?? tags["contact:website"] ?? "",
      practice_type: "Eye care",
      status: "competitor" as const,
      tier: "Market",
    }];
  });
}

function buildVisibilityFindings(signals: WebsiteSignals, hasWebsite: boolean): VisibilityFinding[] {
  if (!hasWebsite) {
    return [{
      label: "Practice website",
      status: "missing",
      detail: "No website was supplied, so the report could not verify the practice's owned local visibility foundation.",
    }];
  }

  return [
    {
      label: "Website access",
      status: signals.reachable ? "strong" : "attention",
      detail: signals.reachable
        ? "The public website was reachable during the review."
        : "The website could not be reached reliably during the review.",
    },
    {
      label: "Secure connection",
      status: signals.https ? "strong" : "attention",
      detail: signals.https ? "The supplied website uses HTTPS." : "The supplied website does not use an HTTPS address.",
    },
    {
      label: "Search result messaging",
      status: signals.title && signals.description ? "strong" : "attention",
      detail: signals.title && signals.description
        ? "The home page exposes both a usable title and description."
        : "The home page is missing a clear title or description signal.",
    },
    {
      label: "Local business context",
      status: signals.localSchema && signals.locationMention ? "strong" : "attention",
      detail: signals.localSchema && signals.locationMention
        ? "The site connects its services to a location and includes local business structured data."
        : "The site could make its location and business identity more explicit to search engines.",
    },
  ];
}

export async function generateAnalysis(request: ReportRequestRecord): Promise<LocalVisibilityReport> {
  const [geocoded, websiteSignals] = await Promise.all([
    geocodeBusiness(request),
    analyzeWebsite(request.website, request.address),
  ]);
  const competitors = await findCompetitors(geocoded, request.business_name);
  const practice: Practice = {
    id: request.id,
    name: request.business_name,
    address: request.address,
    city: "",
    state: "",
    zip: "",
    latitude: geocoded.latitude,
    longitude: geocoded.longitude,
    website: request.website,
    practice_type: "Optometry",
    status: "prospect",
    tier: "Prospect",
  };
  const market = [practice, ...competitors];
  const counts = getCompetitorCountsByRadius(practice, market);
  const countAt = (radius: number) => counts.find((item) => item.radius === radius)?.count ?? 0;
  const nearby = getCompetitorsByDistance(practice, market).filter((item) => item.distanceMiles <= 10);
  const territory = recommendTerritory(practice, market);
  const visibilityFindings = buildVisibilityFindings(websiteSignals, Boolean(request.website));
  const weakSignals = visibilityFindings.filter((finding) => finding.status !== "strong").length;
  const territoryStrength = clamp(Math.round(
    95 -
    countAt(1) * 12 -
    Math.max(0, countAt(3) - countAt(1)) * 5 -
    Math.max(0, countAt(5) - countAt(3)) * 2 -
    Math.max(0, countAt(10) - countAt(5)) * 0.5,
  ));
  const competitionLabel = countAt(3) >= 8 ? "High" : countAt(3) >= 4 ? "Moderate" : "Low";
  const opportunityScore = clamp(Math.round(42 + weakSignals * 9 + Math.min(nearby.length, 12) * 1.5));

  const biggestWins = [
    countAt(1) <= 2
      ? "Own the immediate neighborhood before expanding into the wider market."
      : "Differentiate the practice clearly inside a crowded one-mile market.",
    request.website
      ? "Align the website's service and location signals with the market customers actually search."
      : "Establish a credible practice website that can support local discovery and conversion.",
    "Turn the practice's strongest patient services into a focused local authority plan.",
  ];

  const priorityRecommendations = [
    "Make the practice name, primary location, phone, and core services consistent across the website and major local profiles.",
    competitionLabel === "High"
      ? "Prioritize a small set of high-value services and nearby neighborhoods instead of trying to outrank every competitor at once."
      : "Build depth around the practice's strongest services while the immediate market remains comparatively open.",
    websiteSignals.localSchema
      ? "Keep local business structured data synchronized with visible contact and location details."
      : "Add valid local business structured data and verify it matches the visible practice details.",
    "Create a simple monthly review process for local profile accuracy, patient reviews, and high-intent service pages.",
  ];

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    business: {
      name: request.business_name,
      website: request.website,
      address: geocoded.displayName || request.address,
      latitude: geocoded.latitude,
      longitude: geocoded.longitude,
    },
    executiveSummary: `${request.business_name} has an opportunity score of ${opportunityScore}/100. The clearest path is to strengthen the practice's local identity, focus on the services that matter most commercially, and sequence improvements around the competitive pressure within three miles.`,
    opportunityScore,
    territoryStrength,
    competitionDensity: {
      label: competitionLabel,
      withinOneMile: countAt(1),
      withinThreeMiles: countAt(3),
      withinFiveMiles: countAt(5),
      withinTenMiles: countAt(10),
    },
    territory: {
      recommendedRadiusMiles: territory.suggestedProtectedRadius,
      reviewRadiusMiles: territory.reviewZoneRadius,
    },
    competitors: nearby.slice(0, 12).map(({ practice: competitor, distanceMiles }) => ({
      name: competitor.name,
      address: competitor.address,
      distanceMiles,
      website: competitor.website,
      latitude: competitor.latitude,
      longitude: competitor.longitude,
    })),
    visibilityFindings,
    biggestWins,
    priorityRecommendations,
    roadmap: {
      doFirst: [
        "Correct inconsistent practice name, address, phone, and hours wherever patients find the business.",
        "Confirm the home page states the location, core services, and a clear appointment action.",
        "Resolve the highest-priority website findings in this report.",
      ],
      doNext: [
        "Strengthen focused pages for the two or three services with the best patient and revenue value.",
        "Improve review velocity and respond to recent reviews with useful, human replies.",
        "Connect service pages to the neighborhoods inside the recommended market radius where it is genuinely helpful.",
      ],
      doLater: [
        "Measure calls, appointment requests, and direction requests against the changes made.",
        "Expand content only after the core service and location pages are complete.",
        "Recheck the competitive set and local profile accuracy each quarter.",
      ],
    },
    dataNote: "Territory and competitor findings use public OpenStreetMap data and the practice website available at generation time. Public listings can be incomplete; verify material decisions against current business information.",
  };
}
