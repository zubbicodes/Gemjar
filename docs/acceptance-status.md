# PLAN/PRD acceptance status

## Implemented in repository

- B2C catalogue, search, product detail, persistent guest/account basket, checkout, account profile/addresses, favourites, orders, tracking, cancellation/returns, reorder, invoices, registration, verification, password reset, and PWA shell/offline fallback.
- B2B application, approved organization access, restricted catalogue/pricing, quick and bulk ordering, drafts, reorder, users, addresses, terms, invoices, tracking, and returns.
- Agent server-scoped customer access, explicit customer context, catalogue/order entry, purchase history, invoices, reorder, attribution, and activity views.
- Admin dashboards, products/variants/taxonomy/media references/SEO, staged idempotent CSV import and export, customers/approvals, pricing, agents/assignments, orders, fulfilment, service requests, idempotent refunds, invoices, integrations/retries, notifications, analytics, roles, settings, storefront content, and audit records.
- Central API pricing/VAT/MOQ/pack validation, immutable order snapshots, Stripe webhook replay protection, shipment quantity-derived partial fulfilment, transactional outbox, BullMQ processing, retry/dead-letter recovery, Mintsoft mapped adapter with fallback, Sage mock invoice sync, SES email jobs, structured request logs, health/readiness endpoints, migration rollback notes, CI gates, PWA, and operational runbook.

## Automated evidence

- API unit and authorization suite covers authentication/MFA/CSRF, account boundaries, pricing, carts, orders/outbox, payments/webhook/refund rules, fulfilment/returns, catalogue imports, and Mintsoft contracts.
- Type checks and lint cover API, web, worker, database schema, and shared contracts.
- Production build covers all monorepo packages and Next routes.
- Playwright covers 320/375/414/768 px checkout layout, storefront keyboard/no-overflow behavior, catalogue controls, and automated WCAG 2.2 AA checks on public identity/storefront routes.
- Production dependency audit has no known vulnerabilities.

## PRD final acceptance checklist mapping

All repository-testable items in PRD lines 5363–5493 are implemented. This mapping points to executable ownership rather than treating this report as proof.

| Acceptance area | Result | Authoritative implementation and proof |
| --- | --- | --- |
| Catalogue | Pass | Product/variant/category/attribute/visibility CRUD in `catalogue.service.ts`; staged catalogue transfer in `catalogue-transfer.service.ts`; import tests cover validation and idempotency. |
| B2C | Pass | Public catalogue/search/filter, server-backed persistent basket, verified checkout, account order history, and confirmation routes. Payment tests prove provider-event submission and duplicate webhook handling. |
| B2B | Pass | Approved-organization authorization, customer pricing, MOQ/pack validation, reorder, invoices, team, and address flows. Pricing and account-boundary tests exercise server-side rules. |
| Sales agents | Pass | Assignment-scoped customer reads and ordering, explicit customer context, customer prices, order attribution, invoices, and activity. Negative authorization tests reject unassigned organizations. |
| Orders and fulfilment | Pass | One central `Order` model for every channel, immutable line snapshots, multiple partial shipments, shipment state, tracking events, and customer timeline. Fulfilment tests prove quantity-derived state. |
| Integrations | Pass | Connection/job dashboard, safe errors, correlation and idempotency keys, retries, stale-job recovery, dead letters, administrator alerts, audit events, and customer-facing outbox isolation. Mintsoft order requests carry `Idempotency-Key`. |
| Import/export | Pass | CSV staging, full pre-commit validation, row errors, idempotent transactional commit, retained history, export/download, and audit events. Approximately 500 SKUs are within the supported bounded workflow. |
| Security | Pass | Permission guards and domain-level ownership checks protect administrative, organization, consumer, and agent resources. Authorization tests cover cross-account and unassigned-agent denial. |
| Audit | Pass | Pricing, catalogue transfers, order/fulfilment/refund changes, integration retries/synchronization, and worker success/dead-letter activity create retained audit records. |

Additional repository closure includes Poppins across all portals, mobile portal/storefront navigation, public B2B application with transactional verification email, shipment/B2B/return/integration notifications, editable policy/contact pages, protected-data cleanup on logout, and service-worker exclusion of authenticated routes.

## Environment-gated launch evidence still required

These are deployment acceptance activities, not safely fabricatable repository changes:

- Apply migrations and run full authenticated Playwright journeys against PostgreSQL/Redis. Local Docker daemon was unavailable during this implementation session.
- Certify Stripe live-mode payments/refunds/webhook replay using client keys and webhook endpoint.
- Certify Mintsoft stock/order/shipment mappings in the client sandbox using approved endpoint paths, credentials, rate limits, and fixtures.
- Verify SES production access, sender/domain identity, bounce/complaint handling, and real delivery.
- Finalize AWS account/domain/CIDR/retention choices before expanding the intentionally account-neutral Terraform baseline into the production environment module.
- Execute measured load test against staging, backup restoration rehearsal, device/screen-reader review, production-data rehearsal, staff training, and signed client UAT.

Production launch must remain blocked until every environment-gated item has recorded evidence and owner approval.
