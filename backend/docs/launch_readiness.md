# Launch readiness validation (dev/staging)

This repo includes a deterministic launch-hardening fixture + test pack for non-production environments.

## Seed fixtures

- Seed catalog file: `db/seeds/launch_readiness.seed.json`
- Includes representative accounts across free/paid/trial/canceled/past_due + creator/business/admin roles.
- Includes moderation and ads fixture scenarios used by QA/automated checks.

## Run launch-critical tests

```bash
cd backend
npm run test:launch
```

This suite validates:

- launch seed structure and required fixture states
- subscription lifecycle acceptance coverage
- premium entitlement/ad suppression behavior
- moderation queue + review/media enforcement behavior
- analytics funnel event ingestion and dedupe behavior

## Full backend regression

```bash
cd backend
npm test
```

Use `test:launch` for staging smoke confidence and `npm test` before release branches.
