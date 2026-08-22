# Gemjar operations runbook

## Release gate

Run `pnpm install --frozen-lockfile`, `pnpm db:generate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm audit --prod --audit-level high`, and `pnpm build`. Apply migrations with `prisma migrate deploy` before starting API or worker. Keep `SEED_DATABASE=false` outside disposable environments.

Verify `/api/v1/health` for liveness and `/api/v1/health/ready` for database readiness. Confirm worker logs show successful outbox relay and no growing `DEAD_LETTER` count in Integration Centre.

## Backup and restore

PostgreSQL is system of record. Enable daily encrypted backups and point-in-time recovery with at least 35 days retention in production. Before schema releases, take an on-demand snapshot.

Restore rehearsal:

1. Restore latest snapshot into an isolated database.
2. Set a temporary `DATABASE_URL` pointing only to restored database.
3. Run `prisma migrate status`, then `prisma migrate deploy` if restored snapshot predates a release.
4. Compare counts for users, products, variants, organizations, orders, order items, payments, shipments, invoices, audit logs, outbox events, and integration jobs.
5. Start one isolated API and worker, verify readiness, sign-in, catalogue browse, order read, and one non-production checkout.
6. Record recovery point, recovery duration, row-count evidence, and operator approval. Destroy isolated resources after approval.

Never test restore against production endpoints. Never run full seed during recovery.

## Rollback

Application rollback: redeploy previous immutable image. New migrations are additive; older code ignores new tables and columns. Migrations include scoped rollback notes. Do not drop a column/table until restored backup and compatibility window are confirmed.

If provider errors rise, disable provider credentials/path configuration and retain queued jobs. Manual retry is available in Integration Centre after cause is fixed. Do not delete failed jobs; dead-letter records are operational evidence.

## Incident response

1. Capture correlation ID, affected user/order, UTC time, and deployment image.
2. Check API structured logs, worker logs, health readiness, DB capacity, Redis health, and Integration Centre.
3. For payment incidents, verify Stripe webhook event before changing order state. Never trust browser confirmation alone.
4. For stale Mintsoft stock, orders remain flagged for stock confirmation; operations must resolve shortages manually.
5. Rotate exposed secrets immediately, revoke affected sessions, preserve audit logs, and document customer impact.

## Production prerequisites

- Unique JWT, cookie, MFA encryption, and recovery-code secrets.
- `AUTH_MFA_ENABLED=true`; demo seeds disabled.
- Stripe signing secret and production keys.
- Approved Mintsoft base URL, stock/order paths, API key, mappings, and sandbox certification.
- Verified SES sender/domain and production sending access.
- Private object-storage bucket, least-privilege workload identity, TLS, WAF/rate limits, alarms, and tested backup policy.
- Signed UAT approval for pricing, returns, cancellation, fulfilment, and production data imports.
