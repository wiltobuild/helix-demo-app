import type {
  FulfillmentStatus,
  FulfillmentTransition,
  Order,
  PaymentStatus,
  Timestamp,
} from './models.js';

/** Staff may decline before preparation is complete; customers cancel only before acceptance. */
export const FULFILLMENT_TRANSITIONS: Readonly<
  Record<FulfillmentStatus, readonly FulfillmentStatus[]>
> = Object.freeze({
  'awaiting-acceptance': Object.freeze(['accepted-with-estimate', 'canceled', 'declined'] as const),
  'accepted-with-estimate': Object.freeze(['ready', 'declined'] as const),
  ready: Object.freeze(['collected'] as const),
  collected: Object.freeze([]),
  canceled: Object.freeze([]),
  declined: Object.freeze([]),
});
export const PAYMENT_TRANSITIONS: Readonly<Record<PaymentStatus, readonly PaymentStatus[]>> =
  Object.freeze({
    unpaid: Object.freeze(['paid'] as const),
    paid: Object.freeze(['refund-pending'] as const),
    'refund-pending': Object.freeze(['refunded'] as const),
    refunded: Object.freeze([]),
  });

export function canTransition(from: FulfillmentStatus, to: FulfillmentStatus): boolean {
  return FULFILLMENT_TRANSITIONS[from].includes(to);
}
export function canCancel(order: Pick<Order, 'fulfillmentStatus'>): boolean {
  return canTransition(order.fulfillmentStatus, 'canceled');
}
export function canAccept(order: Pick<Order, 'fulfillmentStatus'>): boolean {
  return canTransition(order.fulfillmentStatus, 'accepted-with-estimate');
}
export function canDecline(order: Pick<Order, 'fulfillmentStatus'>): boolean {
  return canTransition(order.fulfillmentStatus, 'declined');
}
export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  return PAYMENT_TRANSITIONS[from].includes(to);
}
function validateTime(order: Order, at: Timestamp): void {
  if (!Number.isFinite(at) || at < order.timestamps.updatedAt) {
    throw new Error('Transition time must be finite and not precede the last update');
  }
}

/** Returns a new snapshot. No clock, network, messaging, or input mutation. */
export function applyTransition(
  order: Order,
  transition: FulfillmentTransition,
  at: Timestamp,
): Order {
  if (!canTransition(order.fulfillmentStatus, transition.status)) {
    throw new Error(
      `Illegal fulfillment transition: ${order.fulfillmentStatus} -> ${transition.status}`,
    );
  }
  validateTime(order, at);
  const next: Order = {
    ...order,
    fulfillmentStatus: transition.status,
    timestamps: { ...order.timestamps, updatedAt: at },
  };
  switch (transition.status) {
    case 'accepted-with-estimate':
      if (!Number.isFinite(transition.pickupEstimate) || transition.pickupEstimate < at) {
        throw new Error('Pickup estimate must be finite and at or after acceptance');
      }
      next.pickupEstimate = transition.pickupEstimate;
      next.timestamps.acceptedAt = at;
      break;
    case 'ready':
      next.timestamps.readyAt = at;
      break;
    case 'collected':
      next.timestamps.collectedAt = at;
      break;
    case 'canceled':
      next.timestamps.canceledAt = at;
      break;
    case 'declined':
      if (!transition.reason.trim()) throw new Error('A decline reason is required');
      next.declineReason = transition.reason.trim();
      next.timestamps.declinedAt = at;
      break;
  }
  if (
    (transition.status === 'canceled' || transition.status === 'declined') &&
    order.paymentStatus === 'paid'
  ) {
    next.paymentStatus = 'refund-pending';
    next.timestamps.refundRequestedAt = at;
  }
  return next;
}

/** Payment events never advance fulfillment. Refund confirmation must be explicit. */
export function applyPaymentTransition(order: Order, status: PaymentStatus, at: Timestamp): Order {
  if (!canTransitionPayment(order.paymentStatus, status)) {
    throw new Error(`Illegal payment transition: ${order.paymentStatus} -> ${status}`);
  }
  validateTime(order, at);
  const next: Order = {
    ...order,
    paymentStatus: status,
    timestamps: { ...order.timestamps, updatedAt: at },
  };
  if (status === 'paid') {
    next.timestamps.paidAt = at;
    // A late payment confirmation after cancellation/decline still requires a full refund.
    if (order.fulfillmentStatus === 'canceled' || order.fulfillmentStatus === 'declined') {
      next.paymentStatus = 'refund-pending';
      next.timestamps.refundRequestedAt = at;
    }
  }
  if (status === 'refund-pending') next.timestamps.refundRequestedAt = at;
  if (status === 'refunded') next.timestamps.refundedAt = at;
  return next;
}
