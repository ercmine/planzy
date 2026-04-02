# Perbugbot Telegram Mini App deployment

This document describes the production-minded split between Perbug frontend, backend APIs, and the Telegram bot service.

## Architecture

- **Flutter frontend** (`app/`) is compiled to web and hosted on HTTPS.
- **Telegram bot service** (`backend/src/telegramBot/perbugbot.ts`) handles bot commands/menu setup and opens the Mini App URL.
- **Backend API** remains separate and is called by the Flutter app using normal API base URL configuration.

## Environment configuration

Required environment variables for the bot service:

- `TELEGRAM_BOT_TOKEN` (required)
- `PERBUG_MINI_APP_URL` (required, must be `https://`)
- `PERBUG_BOT_DISPLAY_NAME` (optional, defaults to `Perbugbot`)

Security requirement: never commit token values to source control.

## BotFather setup flow

1. Create or open `@Perbugbot` in BotFather.
2. Configure the Mini App URL to your deployed Flutter web URL.
3. Ensure bot commands include `/start` and `/app`.
4. Start the bot worker. It will call Telegram `setChatMenuButton` to attach Mini App launch from menu.

## Local run

```bash
cd backend
npm install
npm run build
TELEGRAM_BOT_TOKEN=*** PERBUG_MINI_APP_URL=https://example.com npm run bot:perbug
```

Use a staging Telegram bot token in local/dev.

## Deploy checklist

1. Build Flutter web:
   ```bash
   cd app
   flutter build web -t lib/main_prod.dart
   ```
2. Deploy `app/build/web` to HTTPS host.
3. Update `PERBUG_MINI_APP_URL` if deploy URL changed.
4. Deploy/restart bot worker with env vars.
5. Verify `/start` in Telegram opens the Mini App.
6. Verify opening URL directly in browser still works without Telegram globals.

## Verification strategy

- Telegram mode: check init data/user/theme from `window.Telegram.WebApp` bridge.
- Browser mode: ensure no crashes when Telegram globals are absent.
- Gameplay mode: verify claim flow, wallet entry, and persistence continue to work in both contexts.
