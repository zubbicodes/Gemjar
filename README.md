# Gemjar Commerce Platform

Production-shaped monorepo for Gemjar's B2C storefront, trade portal, sales-agent workspace, operations console, commerce API, and background workers.

## Local development

1. Copy `.env.example` to `.env`.
2. Run `docker compose up -d`.
3. Run `pnpm install`.
4. Run `pnpm db:generate` and `pnpm db:migrate`.
5. Run `pnpm dev`.

The web app runs at `http://localhost:3000`; the API and OpenAPI docs run at `http://localhost:4000/api/v1` and `/docs`.

The storefront currently uses a polished seeded catalogue so product, customer, pricing, and integration workflows can be developed before client migration files and external credentials arrive.
