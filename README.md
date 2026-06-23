# Slipstream

Internal-first SEO territory and authority assignment prototype for optometry markets.

Slipstream sells exclusive access to visibility infrastructure within a market area. This prototype does not claim to control Google. It tracks practices, competitors, territories, topics, authority assets, and assignments.

## Stack

- Vite
- React
- TypeScript
- Local seed data

## Setup

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually:

```text
http://127.0.0.1:5173/
```

## Routes

- `#/report`
- `#/sources`
- `#/practices`
- `#/territory`
- `#/assets`
- `#/assignments`

## What Works

- Manual practice entry for the Territory Explorer
- Prospect Report page for sales calls
- Printable one-page report layout for PDF export
- Address geocoding through OpenStreetMap Nominatim
- Nearby optometry-related competitor discovery through OpenStreetMap Overpass
- Local Vite proxy routes for OpenStreetMap requests during development
- Haversine distance calculations
- Competitor counts at 0.5, 1, 2, 3, 5, and 10 miles
- Basic Slipstream Territory recommendation
- Visual scorecard for Territory Strength, Competition Density, Search Authority, and Overall Opportunity
- Diagnostics for coordinates, competitors found, data source, and analysis status
- Competitor source comparison tool for OSM, Google, Yelp, Foursquare, and Bing/Azure Maps
- Local authority asset assignment checks
- Seed data for Katy, Cinco Ranch, and Houston optometry practices

## Source Comparison API Keys

The `#/sources` route runs OSM without a key. Paid/commercial sources are optional and read from local environment variables in the Vite dev server:

```bash
set GOOGLE_PLACES_API_KEY=...
set YELP_API_KEY=...
set FOURSQUARE_API_KEY=...
set AZURE_MAPS_KEY=...
npm run dev
```

## Stubbed For Later

- No Google Maps API
- No authentication
- No billing
- No public website
- No persistent database yet
