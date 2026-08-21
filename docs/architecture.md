# Architecture baseline

Gemjar is a modular monolith with separately deployable web, API and worker processes. PostgreSQL is the system of record. Redis carries ephemeral cache and durable BullMQ coordination; it is not a commerce system of record.

## Domain boundaries

- Identity: users, sessions, MFA, roles, permissions.
- Customers: consumers, trade organizations, memberships, addresses, agent assignments.
- Catalogue: products, SKU-level variants, categories, attributes, visibility, media.
- Pricing: retail/B2B/customer prices, quantity tiers, MOQ, pack rules, VAT, audit history.
- Commerce: carts, price quotes, immutable orders and payment records.
- Fulfilment: shipments, shipped item quantities, tracking and returns.
- Integrations: provider adapters, external references, outbox/inbox, retries and imports/exports.

Core services depend on provider interfaces, never Mintsoft or Sage payloads. Provider mappings form an anti-corruption layer at the integration boundary.

## State separation

Order, payment and fulfilment are independent state machines. A partially shipped paid order therefore remains representable without a combinatorial status enum. Customer timelines are projections over the event history.

## Security baseline

The API owns authentication and authorization. Agents must pass an active assignment check for the requested organization on every resource access. Money, VAT, inventory confidence and order validation are recalculated server-side. Webhooks and unsafe retry/commit endpoints are idempotent.
