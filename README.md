# Perbug Monorepo

Perbug is organized as a monorepo with mobile app, backend API, and static marketing/docs web assets.

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

If Flutter reports a package resolution error such as
`Couldn't resolve the package 'perbug' in 'package:perbug/main.dart'`, clear
stale generated artifacts and rebuild:

```bash
./scripts/flutter_reset.sh
cd app
flutter build web
```

Equivalent manual commands:

```bash
cd app
flutter clean
rm -rf .dart_tool build
flutter pub get
flutter build web
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

For testing from another device on your LAN (for example, phone browser), run:

```bash
cd web
pnpm dev --host 0.0.0.0 --port 5173
```

Then open `http://<your-computer-lan-ip>:5173` from the phone.

## Web environment variables

Create `web/.env` based on `web/.env.example`.

- `PERBUG_APPSTORE_URL` — App Store listing URL
- `PERBUG_PLAYSTORE_URL` — Google Play listing URL
- `PERBUG_DOCS_GITHUB_URL` — Base URL used for "Edit on GitHub" links
- `PERBUG_SUPPORT_EMAIL` — support email used on `/support`
- `PERBUG_SITE_URL` — canonical website URL (for SEO/sitemap)
- `PERBUG_ANALYTICS_ENABLED` — `true` or `false` (default false)
- `PERBUG_ANALYTICS_PROVIDER` — optional provider name (analytics stays off by default)

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

- `CORS_ALLOWED_ORIGINS` — comma-separated allowlist of exact origins (include `https://app.perbug.com` in production).
- `CORS_ALLOW_CREDENTIALS` — `true` or `false` for cookie/auth credentialed requests.
- `CORS_ALLOWED_METHODS` — allowed methods for preflight and normal browser requests.
- `CORS_ALLOWED_HEADERS` — allowed request headers (e.g. `Authorization`, `x-user-id`, `x-request-id`).
- `CORS_EXPOSE_HEADERS` — response headers available to browser JS (e.g. `x-request-id`).
- `CORS_MAX_AGE_SECONDS` — preflight cache TTL in seconds.

Example production value:

```bash
CORS_ALLOWED_ORIGINS=https://app.perbug.com
```

Example local Flutter/web values:

```bash
CORS_ALLOWED_ORIGINS=https://app.perbug.com,http://localhost:3000,http://localhost:5173,http://localhost:8080
```

When accessing local services from a phone on the same Wi‑Fi, include your LAN origin too, e.g.:

```bash
CORS_ALLOWED_ORIGINS=http://192.168.1.20:5173,http://192.168.1.20:8080
```

Quick verification:

```bash
curl -i -X OPTIONS https://api.perbug.com/api/geo/search \
  -H "Origin: https://app.perbug.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: content-type,x-user-id,x-request-id"

curl -i "https://api.perbug.com/api/geo/search?q=Berlin" \
  -H "Origin: https://app.perbug.com"
```


## Backend Perbug node RPC configuration

Perbug payout and node integration now uses a local Bitcoin-style JSON-RPC endpoint on localhost only.

- `PERBUG_RPC_HOST=127.0.0.1`
- `PERBUG_RPC_PORT=9332`
- `PERBUG_NODE_PORT=9333`
- `PERBUG_RPC_USER=perbugrpc`
- `PERBUG_RPC_PASSWORD=change_this_to_a_long_random_password`

The backend expects `rpcbind=127.0.0.1` and `rpcallowip=127.0.0.1` in the node config.

