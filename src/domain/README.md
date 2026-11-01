# Shared domain contract

Import runtime helpers and types from `src/domain/index.js` (NodeNext imports use `.js`). This module has no DOM, storage, clock, transport, or notification dependencies. Cart-compatible order lines extend `LineItem` from `../cart.js`; prices are whole cents. `orderTotal` is a pickup total with no shipping fee.

## Fulfillment and payment

- `awaiting-acceptance` → `accepted-with-estimate`, `canceled`, or `declined`.
- `accepted-with-estimate` → `ready` or `declined`.
- `ready` → `collected`.
- Collected, canceled, and declined are terminal.

`applyTransition(order, transition, at)` returns a new snapshot or throws for an illegal transition or invalid payload. Acceptance requires a finite pickup estimate at or after acceptance. Declines require a nonblank reason. All timestamps are caller-supplied Unix milliseconds; updates cannot move backward. Only staff should invoke acceptance, readiness, collection, or decline; authorization belongs to the caller.

Payment follows `unpaid` → `paid` → `refund-pending` → `refunded` via `applyPaymentTransition`. Payment never advances fulfillment; fulfillment can progress while payment is outstanding. Paid cancellations/declines request a full refund automatically. A late payment confirmation after cancellation/decline also enters refund-pending. Only explicit confirmation advances to refunded; the full refund amount is `orderTotal(order.items)`. The payment helper also supports independently initiated refunds. The store/payment adapter owns actual collection and refund execution and event deduplication.

The store can emit readiness notifications when fulfillment changes to ready. Notification delivery must not control order status.

## New submissions

Use `priceDrink` to validate customization selections and calculate each unit price. Each option permits one choice; required choices must be supplied explicitly. Use `validateSubmission(items, menu, cafe)` immediately before creating an order. It rejects paused ordering, empty orders, unknown/unavailable SKUs, invalid quantities, invalid customizations, stale prices, and unsafe totals. It throws on failure and returns void on success. Availability and pause checks apply only to new submissions.

Create orders as awaiting-acceptance with unpaid status until payment is confirmed. The caller supplies IDs, contact data, and timestamps. Account ID is optional; favorites contain SKU/customization references and order history contains order IDs. Identity, contact validation, and persistence belong to the consuming layer.

`seedMenu` is illustrative data derived from the approved visual concept. Scene image keys are asset identifiers for the UI to resolve, not external URLs. Treat seed data and snapshots as immutable and copy when changing availability.
