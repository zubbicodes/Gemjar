# Gemjar Commerce Platform

Production-shaped monorepo for Gemjar's B2C storefront, trade portal, sales-agent workspace, operations console, commerce API, and background workers.

## Local development

1. Copy `.env.example` to `.env`.
2. Run `docker compose up -d`.
3. Run `pnpm install`.
4. Run `pnpm db:generate`, `pnpm db:migrate`, and `pnpm db:seed`.
5. Run `pnpm dev`.

The web app runs at `http://localhost:3000`; the API and OpenAPI docs run at `http://localhost:4000/api/v1` and `/docs`.

The storefront currently uses a polished seeded catalogue so product, customer, pricing, and integration workflows can be developed before client migration files and external credentials arrive.

## Demonstration accounts

All demonstration accounts use the password `GemjarDemo!2026` unless `DEMO_USER_PASSWORD` is set:

- `admin@gemjar.test` — administrator with every permission.
- `agent@gemjar.test` — sales agent AG-001, assigned to North & Finch.
- `buyer@gemjar.test` — approved North & Finch organization owner.
- `customer@gemjar.test` — retail consumer.

Administrators and sales agents pass a TOTP challenge whenever `AUTH_MFA_ENABLED`
is anything other than `false`. Deployments default to `false` so a demonstration
needs no authenticator app; set it to `true` before the platform carries real
customer data.

### Seeding

- `pnpm --filter @gemjar/database run seed:demo` — the non-destructive demonstration
  seed. Creates the accounts above, the catalogue, delivery methods, reference
  customer pricing, and operational history: orders across all three channels, a
  live partial shipment with tracking, invoices, a return request, a pending trade
  application, and integration job history. Every step upserts or skips rows that
  already exist, so it is safe to run against a live demonstration environment.
- `pnpm db:seed` — the full seed. Does everything above **and resets** North & Finch
  trade pricing to the reference tiers.

## Deployment

Coolify deploys from `docker-compose.coolify.yml`; attach the public domain to the
`web` service on port 3000. The `migrate` service applies migrations on every
deployment, then seeds:

| Variable             | Default           | Effect                                                                   |
| -------------------- | ----------------- | ------------------------------------------------------------------------ |
| `SEED_DEMO_DATA`     | `true`            | Runs the non-destructive demonstration seed.                             |
| `SEED_DATABASE`      | `false`           | Runs the full seed, resetting trade pricing.                             |
| `DEMO_USER_PASSWORD` | `GemjarDemo!2026` | Password applied to the demonstration accounts on every deployment.      |
| `AUTH_MFA_ENABLED`   | `false`           | Set to `true` to require an authenticator for administrators and agents. |
| `SUPPORT_EMAIL`      | empty             | Optional recipient for integration dead-letter email alerts. |

Set `SEED_DEMO_DATA=false`, `SEED_DATABASE=false`, and `AUTH_MFA_ENABLED=true`
before the platform carries real customer data, and give every environment unique
`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET`, `MFA_ENCRYPTION_KEY`,
and `MFA_RECOVERY_PEPPER` values.

Outside production, email verification and password-reset tokens are returned to aid local testing. In production, token links are queued transactionally and sent by the worker through SES when `SES_FROM_EMAIL` and AWS workload credentials are configured.

Mintsoft live mode requires `MINTSOFT_BASE_URL`, `MINTSOFT_API_KEY`, `MINTSOFT_STOCK_PATH`, and `MINTSOFT_ORDER_PATH`. Without all four, deterministic demo stock/order behavior remains active.

Operational release, backup/restore, rollback, incident, and provider-readiness procedures are in [docs/operations-runbook.md](docs/operations-runbook.md).
Requirement coverage and remaining environment-gated launch evidence are tracked in [docs/acceptance-status.md](docs/acceptance-status.md).
