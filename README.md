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

- `admin@gemjar.test` — administrator; authenticator enrolment is required on first sign-in.
- `agent@gemjar.test` — sales agent assigned to North & Finch; authenticator enrolment is required on first sign-in.
- `buyer@gemjar.test` — approved North & Finch organization owner.
- `customer@gemjar.test` — retail consumer.

Administrators and sales agents always pass a TOTP challenge, so the first sign-in
for those two accounts asks for an authenticator app. Scan the code shown at sign-in
with any authenticator, then enter the six-digit code.

`pnpm --filter @gemjar/database run seed:users` creates or refreshes these accounts on their
own. It is idempotent and touches no catalogue, pricing, or order data, so it is safe to run
against an environment mid-demonstration. `pnpm db:seed` runs it as part of the full
demonstration seed, which also loads the catalogue, trade pricing, and delivery methods.

## Deployment

Coolify deploys from `docker-compose.coolify.yml`; attach the public domain to the `web`
service on port 3000. The `migrate` service applies migrations on every deployment and then
seeds according to two variables:

- `SEED_DEMO_USERS` (default `true`) — creates the four demonstration accounts above and
  resets their passwords to `DEMO_USER_PASSWORD` (default `GemjarDemo!2026`).
- `SEED_DATABASE` (default `false`) — additionally loads the demonstration catalogue, trade
  pricing, and delivery methods. This resets North & Finch pricing rows, so leave it `false`
  after the first deployment.

Set both to `false` before the platform carries real customer data.

The local API returns email verification and password reset tokens only outside production until SES delivery is connected. Set unique `JWT_ACCESS_SECRET`, `COOKIE_SECRET`, `MFA_ENCRYPTION_KEY`, and `MFA_RECOVERY_PEPPER` values in every deployed environment.
