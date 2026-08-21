# Integration contracts

## Mintsoft

Gemjar owns product presentation, customers, pricing and orders. Mintsoft supplies authoritative SKU availability and fulfilment events. The first live mapping requires the client's sandbox credentials and API documentation.

- Pull stock by external SKU reference.
- Push paid B2C and approved-account B2B/agent orders with idempotency keys.
- Pull or receive shipments, item quantities, tracking numbers and status events.
- Store external references separately from Gemjar IDs.
- At the 15-minute default freshness threshold, continue order submission with `stockConfirmationPending=true`, enqueue an immediate sync and alert operations.

## Sage 50

The current adapter is a deterministic development/staging mock covering success, transient failure, permanent mapping failure and invoice lookup. It is prohibited in production. Production uses disabled/manual file exchange until a live Sage phase is approved.
