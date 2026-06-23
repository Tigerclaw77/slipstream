const EARTH_RADIUS_MILES = 3958.8;
const SEARCH_TERMS = ["optometrist", "optical", "eye care"];
const OPEN_DATA_HEADERS = {
  Referer: "http://127.0.0.1:5174/",
  "User-Agent": "SlipstreamLocalPrototype/0.1 (local territory analysis)",
};

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function haversineDistanceMiles(origin, destination) {
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

function normalizeName(value) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(od|o d|pa|pllc|llc|inc|the)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function sourceStatus(provider, results, dataSource) {
  return {
    provider,
    status: "success",
    dataSource,
    results: dedupeAndSort(results),
  };
}

function missingKey(provider, envName) {
  return {
    provider,
    status: "missing_key",
    dataSource: envName,
    error: `Set ${envName} and restart npm run dev.`,
    results: [],
  };
}

function failure(provider, error, dataSource) {
  return {
    provider,
    status: "failed",
    dataSource,
    error: error instanceof Error ? error.message : "Provider failed.",
    results: [],
  };
}

function dedupeAndSort(results) {
  const seen = new Map();

  for (const result of results) {
    if (!result.name || !Number.isFinite(result.latitude) || !Number.isFinite(result.longitude)) {
      continue;
    }

    const key = `${normalizeName(result.name)}-${result.latitude.toFixed(4)}-${result.longitude.toFixed(4)}`;

    if (!seen.has(key) || result.distanceMiles < seen.get(key).distanceMiles) {
      seen.set(key, result);
    }
  }

  return Array.from(seen.values()).sort((a, b) => a.distanceMiles - b.distanceMiles);
}

function boundedViewbox({ latitude, longitude }, radiusMiles) {
  const latitudeDelta = radiusMiles / 69;
  const longitudeDelta = radiusMiles / (69 * Math.cos((latitude * Math.PI) / 180));

  return {
    east: longitude + longitudeDelta,
    north: latitude + latitudeDelta,
    south: latitude - latitudeDelta,
    west: longitude - longitudeDelta,
  };
}

function buildNominatimAddress(place) {
  const address = place.address ?? {};
  const streetAddress = [address.house_number, address.road].filter(Boolean).join(" ");
  const locality = [
    address.city || address.town || address.village || address.suburb,
    address.state,
    address.postcode,
  ]
    .filter(Boolean)
    .join(", ");

  return [streetAddress, locality].filter(Boolean).join(", ") || place.display_name || "";
}

function isOptometryRelated(name, category, type) {
  const normalized = normalizeName(`${name} ${category ?? ""} ${type ?? ""}`);

  return (
    normalized.includes("optometrist") ||
    normalized.includes("optometry") ||
    normalized.includes("optician") ||
    normalized.includes("optical") ||
    normalized.includes("eye care") ||
    normalized.includes("eye center") ||
    normalized.includes("vision")
  );
}

async function geocodeAddress(address) {
  const searchParams = new URLSearchParams({
    addressdetails: "1",
    countrycodes: "us",
    format: "jsonv2",
    limit: "1",
    q: address,
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${searchParams}`, {
    headers: OPEN_DATA_HEADERS,
  });

  if (!response.ok) {
    throw new Error(`Geocoding failed with status ${response.status}.`);
  }

  const results = await response.json();
  const first = results[0];

  if (!first) {
    throw new Error("No geocoding result found.");
  }

  const latitude = Number(first.lat);
  const longitude = Number(first.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Geocoding returned invalid coordinates.");
  }

  return { latitude, longitude };
}

async function osmProvider(center, radiusMiles) {
  try {
    const viewbox = boundedViewbox(center, radiusMiles);
    const results = [];

    for (const [index, term] of SEARCH_TERMS.entries()) {
      if (index > 0) {
        await sleep(850);
      }

      const searchParams = new URLSearchParams({
        addressdetails: "1",
        bounded: "1",
        countrycodes: "us",
        extratags: "1",
        format: "jsonv2",
        limit: "30",
        q: term,
        viewbox: `${viewbox.west},${viewbox.north},${viewbox.east},${viewbox.south}`,
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${searchParams}`, {
        headers: OPEN_DATA_HEADERS,
      });

      if (!response.ok) {
        throw new Error(`OSM search failed with status ${response.status}.`);
      }

      const places = await response.json();

      for (const place of places) {
        const name = place.name?.trim();
        const latitude = Number(place.lat);
        const longitude = Number(place.lon);

        if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          continue;
        }

        if (!isOptometryRelated(name, place.category, place.type)) {
          continue;
        }

        const distanceMiles = haversineDistanceMiles(center, { latitude, longitude });

        if (distanceMiles <= radiusMiles) {
          results.push({
            id: `${place.osm_type ?? "osm"}-${place.osm_id ?? place.place_id}`,
            name,
            address: buildNominatimAddress(place),
            latitude,
            longitude,
            distanceMiles,
            website: place.extratags?.website || place.extratags?.["contact:website"],
          });
        }
      }
    }

    return sourceStatus("OSM", results, "OpenStreetMap Nominatim bounded search");
  } catch (error) {
    return failure("OSM", error, "OpenStreetMap Nominatim bounded search");
  }
}

async function googleProvider(center, radiusMiles) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return missingKey("Google", "GOOGLE_PLACES_API_KEY");
  }

  try {
    const results = [];

    for (const term of SEARCH_TERMS) {
      const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.websiteUri,places.primaryType,places.types",
        },
        body: JSON.stringify({
          textQuery: term,
          locationBias: {
            circle: {
              center: {
                latitude: center.latitude,
                longitude: center.longitude,
              },
              radius: Math.min(radiusMiles * 1609.344, 50000),
            },
          },
          maxResultCount: 20,
        }),
      });

      if (!response.ok) {
        throw new Error(`Google Places returned ${response.status}.`);
      }

      const payload = await response.json();

      for (const place of payload.places ?? []) {
        const latitude = place.location?.latitude;
        const longitude = place.location?.longitude;

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          continue;
        }

        const distanceMiles = haversineDistanceMiles(center, { latitude, longitude });

        if (distanceMiles <= radiusMiles) {
          results.push({
            id: place.id,
            name: place.displayName?.text ?? "Unnamed place",
            address: place.formattedAddress ?? "",
            latitude,
            longitude,
            distanceMiles,
            rating: place.rating,
            reviewCount: place.userRatingCount,
            website: place.websiteUri,
          });
        }
      }
    }

    return sourceStatus("Google", results, "Google Places API Text Search");
  } catch (error) {
    return failure("Google", error, "Google Places API Text Search");
  }
}

async function yelpProvider(center, radiusMiles) {
  const apiKey = process.env.YELP_API_KEY;

  if (!apiKey) {
    return missingKey("Yelp", "YELP_API_KEY");
  }

  try {
    const searchParams = new URLSearchParams({
      categories: "optometrists,opticians",
      latitude: String(center.latitude),
      limit: "50",
      longitude: String(center.longitude),
      radius: String(Math.min(Math.round(radiusMiles * 1609.344), 40000)),
      sort_by: "distance",
    });
    const response = await fetch(`https://api.yelp.com/v3/businesses/search?${searchParams}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Yelp Fusion returned ${response.status}.`);
    }

    const payload = await response.json();
    const results = [];

    for (const business of payload.businesses ?? []) {
      const latitude = business.coordinates?.latitude;
      const longitude = business.coordinates?.longitude;

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        continue;
      }

      const distanceMiles = haversineDistanceMiles(center, { latitude, longitude });

      if (distanceMiles <= radiusMiles) {
        results.push({
          id: business.id,
          name: business.name,
          address: business.location?.display_address?.join(", ") ?? "",
          latitude,
          longitude,
          distanceMiles,
          rating: business.rating,
          reviewCount: business.review_count,
          website: business.url,
        });
      }
    }

    return sourceStatus("Yelp", results, "Yelp Fusion Business Search");
  } catch (error) {
    return failure("Yelp", error, "Yelp Fusion Business Search");
  }
}

async function foursquareProvider(center, radiusMiles) {
  const apiKey = process.env.FOURSQUARE_API_KEY;

  if (!apiKey) {
    return missingKey("Foursquare", "FOURSQUARE_API_KEY");
  }

  try {
    const results = [];

    for (const term of SEARCH_TERMS) {
      const searchParams = new URLSearchParams({
        fields: "fsq_id,name,location,geocodes,categories,distance,rating,website",
        limit: "50",
        ll: `${center.latitude},${center.longitude}`,
        query: term,
        radius: String(Math.min(Math.round(radiusMiles * 1609.344), 100000)),
      });
      const response = await fetch(`https://api.foursquare.com/v3/places/search?${searchParams}`, {
        headers: {
          Accept: "application/json",
          Authorization: apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Foursquare Places returned ${response.status}.`);
      }

      const payload = await response.json();

      for (const place of payload.results ?? []) {
        const coordinates = place.geocodes?.main;
        const latitude = coordinates?.latitude;
        const longitude = coordinates?.longitude;

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          continue;
        }

        const distanceMiles = haversineDistanceMiles(center, { latitude, longitude });

        if (distanceMiles <= radiusMiles) {
          results.push({
            id: place.fsq_id,
            name: place.name,
            address: place.location?.formatted_address ?? "",
            latitude,
            longitude,
            distanceMiles,
            rating: place.rating,
            website: place.website,
          });
        }
      }
    }

    return sourceStatus("Foursquare", results, "Foursquare Places Search");
  } catch (error) {
    return failure("Foursquare", error, "Foursquare Places Search");
  }
}

async function bingProvider(center, radiusMiles) {
  const apiKey = process.env.AZURE_MAPS_KEY || process.env.BING_MAPS_KEY;

  if (!apiKey) {
    return missingKey("Bing/Azure Maps", "AZURE_MAPS_KEY");
  }

  try {
    const results = [];

    for (const term of SEARCH_TERMS) {
      const searchParams = new URLSearchParams({
        "api-version": "1.0",
        lat: String(center.latitude),
        limit: "100",
        lon: String(center.longitude),
        query: term,
        radius: String(Math.min(Math.round(radiusMiles * 1609.344), 50000)),
        "subscription-key": apiKey,
      });
      const response = await fetch(`https://atlas.microsoft.com/search/poi/json?${searchParams}`);

      if (!response.ok) {
        throw new Error(`Azure Maps Search returned ${response.status}.`);
      }

      const payload = await response.json();

      for (const item of payload.results ?? []) {
        const latitude = item.position?.lat;
        const longitude = item.position?.lon;

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          continue;
        }

        const distanceMiles = haversineDistanceMiles(center, { latitude, longitude });

        if (distanceMiles <= radiusMiles) {
          results.push({
            id: item.id,
            name: item.poi?.name ?? "Unnamed place",
            address: item.address?.freeformAddress ?? "",
            latitude,
            longitude,
            distanceMiles,
          });
        }
      }
    }

    return sourceStatus("Bing/Azure Maps", results, "Azure Maps Search POI");
  } catch (error) {
    return failure("Bing/Azure Maps", error, "Azure Maps Search POI");
  }
}

function buildComparison(providerResults) {
  const union = new Map();

  for (const providerResult of providerResults) {
    for (const result of providerResult.results) {
      const key = normalizeName(result.name);

      if (!union.has(key)) {
        union.set(key, {
          name: result.name,
          providers: [],
          byProvider: {},
        });
      }

      const record = union.get(key);
      record.providers.push(providerResult.provider);
      record.byProvider[providerResult.provider] = result;
    }
  }

  const overlapRows = Array.from(union.values())
    .map((record) => ({
      name: record.name,
      providers: Array.from(new Set(record.providers)),
    }))
    .sort((a, b) => b.providers.length - a.providers.length || a.name.localeCompare(b.name));

  return {
    overlaps: overlapRows.filter((row) => row.providers.length > 1),
    missingByProvider: providerResults.map((providerResult) => ({
      provider: providerResult.provider,
      missing: overlapRows
        .filter((row) => !row.providers.includes(providerResult.provider))
        .map((row) => row.name),
    })),
  };
}

export async function compareCompetitorSources({ address, radiusMiles }) {
  if (!address?.trim()) {
    throw new Error("Address is required.");
  }

  const center = await geocodeAddress(address.trim());
  const providerResults = await Promise.all([
    osmProvider(center, radiusMiles),
    googleProvider(center, radiusMiles),
    yelpProvider(center, radiusMiles),
    foursquareProvider(center, radiusMiles),
    bingProvider(center, radiusMiles),
  ]);

  return {
    address,
    center,
    radiusMiles,
    providers: providerResults,
    comparison: buildComparison(providerResults),
  };
}
