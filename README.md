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

## Local demonstration accounts

All demonstration accounts use the password `GemjarDemo!2026`:

- `admin@gemjar.test` — administrator; authenticator enrolment is required on first sign-in.
- `agent@gemjar.test` — sales agent assigned to North & Finch; authenticator enrolment is required on first sign-in.
- `buyer@gemjar.test` — approved North & Finch organization owner.

The local API returns email verification and password reset tokens only outside production until SES delivery is connected. Set unique `JWT_ACCESS_SECRET`, `COOKIE_SECRET`, `MFA_ENCRYPTION_KEY`, and `MFA_RECOVERY_PEPPER` values in every deployed environment.
