# Perbug Telegram Mini App Bot Setup (`@perbugbot`)

This guide covers the manual Telegram-side actions that cannot be automated from the VPS.

## 1) Deploy server infrastructure

Run the deployment script on your Ubuntu 24.04 VPS:

```bash
sudo bash deploy_telegram_perbug_bot.sh \
  --domain telegram.perbug.com \
  --bot-username perbugbot \
  --mini-app-url https://app.perbug.com \
  --certbot-email admin@perbug.com
```

Then edit the env file and add the token from BotFather:

```bash
sudoedit /etc/perbug-telegram-bot/perbug-telegram-bot.env
sudo systemctl restart perbug-telegram-bot
```

## 2) BotFather manual steps (inside Telegram)

> These steps are manual and must be done in Telegram chat with **@BotFather**.

1. Open chat with **@BotFather**.
2. Ensure the bot exists:
   - `/mybots` → select `@perbugbot`, or
   - `/newbot` if it does not exist.
3. Get/rotate token:
   - `/token` (or `/revoke` then `/token` for rotation).
   - Copy token into VPS env file (`TELEGRAM_BOT_TOKEN=`).
4. Optional profile setup:
   - `/setname` for display name.
   - `/setdescription` for long description.
   - `/setabouttext` for short about text.
   - `/setuserpic` for bot avatar.
5. Configure chat menu button (recommended):
   - `/mybots` → `@perbugbot` → **Bot Settings** → **Menu Button**.
   - Choose **Configure menu button**.
   - Button text: `Open Perbug`.
   - URL: your Mini App URL, e.g. `https://app.perbug.com`.
6. Configure Mini App launch URL for inline/button flows:
   - In the same Bot Settings area, configure Web App/Mini App URL where prompted.
   - Use: `https://app.perbug.com` (or your final production Mini App URL).
7. (If prompted) disable privacy mode only if your use-case requires reading all group messages:
   - `/setprivacy` → select `@perbugbot`.

## 3) Webhook and endpoint details

The service sets the webhook on boot to:

- `https://telegram.perbug.com/telegram/webhook`

Health endpoint:

- `https://telegram.perbug.com/health`

## 4) Operational commands

```bash
# Service lifecycle
sudo systemctl status perbug-telegram-bot --no-pager
sudo systemctl restart perbug-telegram-bot
sudo systemctl stop perbug-telegram-bot

# Logs
sudo journalctl -u perbug-telegram-bot -f

# Nginx
sudo nginx -t
sudo systemctl reload nginx
```

## 5) Post-deploy verification

```bash
# Health checks
curl -fsS http://127.0.0.1:8088/health | jq .
curl -fsS https://telegram.perbug.com/health | jq .

# TLS certificate status
sudo certbot certificates

# Webhook info (requires TELEGRAM_BOT_TOKEN in shell)
TOKEN='replace_me'
curl -sS "https://api.telegram.org/bot${TOKEN}/getWebhookInfo" | jq .
```
