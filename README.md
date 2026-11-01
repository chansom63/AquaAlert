# AquaAlert

AquaAlert is a React and TypeScript frontend for public water quality information and municipal operations in Gwalior, Madhya Pradesh. It includes citizen and admin portal views, source readings and alerts, a Gwalior ward overview, and an interactive Leaflet map using OpenStreetMap tiles.

## Requirements

- Node.js 18 or newer
- npm

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

The app runs with illustrative local Gwalior demo data when `VITE_API_BASE_URL` is empty. To connect a deployed API Gateway/Lambda endpoint, set that variable in `.env` and restart the dev server. Set `VITE_MAPBOX_ACCESS_TOKEN` to use Mapbox Streets for the map; if it is empty, the map uses OpenStreetMap tiles. This Vite variable is included in browser requests, so use a public token and restrict its allowed URLs in Mapbox.

## Production build

```bash
npm run build
npm run preview
```

## Notes

- The ward dataset and readings shown without a configured API are illustrative demo data.
- The map uses Mapbox Streets when `VITE_MAPBOX_ACCESS_TOKEN` is configured, and OpenStreetMap as a fallback. The Tigra feeder route is a reference route; last-mile pipeline geometry and fallback ward source locations are approximate unless the API supplies source coordinates.
- Screening readings are informational and are not a water safety certification.
- Do not commit `.env` or credentials. Use `.env.example` as the configuration template.
