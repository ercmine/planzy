# Dryad Monorepo

Dryad is organized as a monorepo with mobile app, backend API, and static marketing/docs web assets.

## Repository layout

- `app/` — Flutter mobile application
- `backend/` — Node/TypeScript backend services
- `web/` — Astro + MDX + Tailwind marketing and documentation site

## Running each project

### Mobile app (`/app`)

```bash
cd app
flutter pub get
flutter run
```

### Backend (`/backend`)

```bash
cd backend
npm install
npm run dev
```

### Website (`/web`)

```bash
cd web
pnpm install
pnpm dev
```

Convenience scripts from repo root:

```bash
./scripts/web_dev.sh
./scripts/web_build.sh
```

## Web environment variables

Create `web/.env` based on `web/.env.example`.

- `DRYAD_APPSTORE_URL` — App Store listing URL
- `DRYAD_PLAYSTORE_URL` — Google Play listing URL
- `DRYAD_DOCS_GITHUB_URL` — Base URL used for "Edit on GitHub" links
- `DRYAD_SUPPORT_EMAIL` — support email used on `/support`
- `DRYAD_SITE_URL` — canonical website URL (for SEO/sitemap)
- `DRYAD_ANALYTICS_ENABLED` — `true` or `false` (default false)
- `DRYAD_ANALYTICS_PROVIDER` — optional provider name (analytics stays off by default)

If store links are missing, the UI gracefully displays “Coming soon”.

## Building for static hosting

```bash
cd web
pnpm build
```

Static output is generated in `web/dist`.

## Deployment notes

The website is static and can be deployed to any static host with custom domains.

### Vercel

- Root directory: `web`
- Build command: `pnpm build`
- Output directory: `dist`

### Cloudflare Pages

- Project root: `web`
- Build command: `pnpm build`
- Build output: `dist`

### Netlify

- Base directory: `web`
- Build command: `pnpm build`
- Publish directory: `dist`


## Backend CORS configuration

Configure backend CORS via environment variables (see `.env.example`).

- `CORS_ALLOWED_ORIGINS` — comma-separated allowlist of exact origins (include `https://app.dryad.dev` in production).
- `CORS_ALLOW_CREDENTIALS` — `true` or `false` for cookie/auth credentialed requests.
- `CORS_ALLOWED_METHODS` — allowed methods for preflight and normal browser requests.
- `CORS_ALLOWED_HEADERS` — allowed request headers (e.g. `Authorization`, `x-user-id`, `x-request-id`).
- `CORS_EXPOSE_HEADERS` — response headers available to browser JS (e.g. `x-request-id`).
- `CORS_MAX_AGE_SECONDS` — preflight cache TTL in seconds.

Example production value:

```bash
CORS_ALLOWED_ORIGINS=https://app.dryad.dev
```

Example local Flutter/web values:

```bash
CORS_ALLOWED_ORIGINS=https://app.dryad.dev,http://localhost:3000,http://localhost:5173,http://localhost:8080
```

Quick verification:

```bash
curl -i -X OPTIONS https://api.dryad.dev/api/geo/search \
  -H "Origin: https://app.dryad.dev" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: content-type,x-user-id,x-request-id"

curl -i "https://api.dryad.dev/api/geo/search?q=Berlin" \
  -H "Origin: https://app.dryad.dev"
```
