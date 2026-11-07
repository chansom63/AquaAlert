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

Set `VITE_API_BASE_URL` in `.env` to connect the deployed API Gateway/Lambda endpoint, then restart the dev server. The Admin source, reading, alert, and response-action views read the API only. Readings and actions follow every `nextToken` page from `/readings` and `/actions`. Set `VITE_MAPBOX_ACCESS_TOKEN` to use Mapbox Streets for the map; if it is empty, the map uses OpenStreetMap tiles. This Vite variable is included in browser requests, so use a public token and restrict its allowed URLs in Mapbox.

## Production build

```bash
npm run build
npm run preview
```

## Notes

- The citizen-facing ward dataset and readings shown without a configured API are illustrative demo data; Admin table views do not use those fallbacks.
- The map uses Mapbox Streets when `VITE_MAPBOX_ACCESS_TOKEN` is configured, and OpenStreetMap as a fallback. The Tigra feeder route is a reference route; last-mile pipeline geometry and fallback ward source locations are approximate unless the API supplies source coordinates.
- Screening readings are informational and are not a water safety certification.
- Do not commit `.env` or credentials. Use `.env.example` as the configuration template.

## DynamoDB demo seed

`backend/seed/admin_demo_records.json` contains the former Admin examples labeled `isDemo: true`. They are synthetic values, not real readings or approved health findings. A local seed template is at `backend/.env.example`; copy it to `backend/.env` and set the AWS Region and original table names. AWS credentials belong to the backend only. Prefer an AWS profile or Lambda execution role; the optional key variables support local one-time seeding.

Install `boto3`, review the default dry run, then explicitly write missing keys:

```bash
python3 -m pip install boto3
python3 scripts/seed_dynamodb.py
python3 scripts/seed_dynamodb.py --apply
```

The importer does not overwrite existing DynamoDB items. The Lambda's CORS response currently allows any origin (`*`), matching the requested public CORS policy. Confirm API Gateway's own CORS settings also allow the browser origin, `GET`, `POST`, `OPTIONS`, and `Content-Type`/`Authorization` headers.
