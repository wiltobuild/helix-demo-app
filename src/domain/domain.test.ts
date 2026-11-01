import { describe, expect, it } from 'vitest';
import {
  FULFILLMENT_TRANSITIONS,
  PAYMENT_TRANSITIONS,
  applyPaymentTransition,
  applyTransition,
  canAccept,
  canCancel,
  canDecline,
  canTransition,
  canTransitionPayment,
  orderTotal,
  priceDrink,
  seedMenu,
  validateSubmission,
} from './index.js';
import type { Drink, FulfillmentStatus, Order, OrderLineItem, PaymentStatus } from './index.js';

const selections = [{ optionId: 'milk', choiceId: 'whole' }];
const drink = seedMenu[0]!;
const item: OrderLineItem = {
  sku: drink.sku,
  name: drink.name,
  quantity: 1,
  unitPrice: drink.price,
  customizations: selections,
};
function order(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    items: [item],
    fulfillmentStatus: 'awaiting-acceptance',
    paymentStatus: 'unpaid',
    paymentMethod: 'at-pickup',
    customerName: 'Guest',
    customerPhone: '+15555550123',
    timestamps: { createdAt: 100, updatedAt: 100 },
    ...overrides,
  };
}

describe('fulfillment', () => {
  it('allows exactly the documented transition edges', () => {
    const edges = [
      'awaiting-acceptance/accepted-with-estimate',
      'awaiting-acceptance/canceled',
      'awaiting-acceptance/declined',
      'accepted-with-estimate/ready',
      'accepted-with-estimate/declined',
      'ready/collected',
    ];
    const statuses = Object.keys(FULFILLMENT_TRANSITIONS) as FulfillmentStatus[];
    for (const from of statuses) {
      for (const to of statuses) {
        expect(canTransition(from, to)).toBe(edges.includes(`${from}/${to}`));
      }
      expect(canAccept(order({ fulfillmentStatus: from }))).toBe(from === 'awaiting-acceptance');
      expect(canCancel(order({ fulfillmentStatus: from }))).toBe(from === 'awaiting-acceptance');
      expect(canDecline(order({ fulfillmentStatus: from }))).toBe(
        from === 'awaiting-acceptance' || from === 'accepted-with-estimate',
      );
    }
  });

  it('progresses existing unpaid orders without modifying input or requiring payment', () => {
    const initial = order();
    Object.freeze(initial);
    Object.freeze(initial.timestamps);
    const accepted = applyTransition(
      initial,
      { status: 'accepted-with-estimate', pickupEstimate: 300 },
      200,
    );
    expect(accepted.pickupEstimate).toBe(300);
    expect(accepted.timestamps.acceptedAt).toBe(200);
    const ready = applyTransition(accepted, { status: 'ready' }, 300);
    const collected = applyTransition(ready, { status: 'collected' }, 400);
    expect(ready.timestamps.readyAt).toBe(300);
    expect(collected.timestamps.collectedAt).toBe(400);
    expect(collected.paymentStatus).toBe('unpaid');
    expect(initial).toEqual(order());
    expect(() => applyTransition(collected, { status: 'canceled' }, 500)).toThrow(
      'Illegal fulfillment',
    );
  });

  it.each([NaN, Infinity, 199])('rejects invalid pickup estimate %s', (pickupEstimate) => {
    expect(() =>
      applyTransition(order(), { status: 'accepted-with-estimate', pickupEstimate }, 200),
    ).toThrow('Pickup estimate');
  });
  it('accepts an estimate equal to the current time', () => {
    expect(
      applyTransition(order(), { status: 'accepted-with-estimate', pickupEstimate: 200 }, 200)
        .pickupEstimate,
    ).toBe(200);
  });
  it.each([NaN, Infinity, 99])('rejects invalid transition time %s', (at) => {
    expect(() => applyTransition(order(), { status: 'canceled' }, at)).toThrow('Transition time');
  });
  it('requires a nonblank decline reason', () => {
    expect(() => applyTransition(order(), { status: 'declined', reason: '  ' }, 200)).toThrow(
      'reason',
    );
    const declined = applyTransition(order(), { status: 'declined', reason: ' Sold out ' }, 200);
    expect(declined.declineReason).toBe('Sold out');
    expect(declined.timestamps.declinedAt).toBe(200);
    expect(declined.paymentStatus).toBe('unpaid');
  });
  it.each(['canceled', 'declined'] as const)(
    'requests but never completes a paid %s refund',
    (status) => {
      const transition = status === 'declined' ? { status, reason: 'Sold out' } : { status };
      for (const paymentStatus of Object.keys(PAYMENT_TRANSITIONS) as PaymentStatus[]) {
        const initial = order({ paymentMethod: 'online', paymentStatus });
        const result = applyTransition(initial, transition, 200);
        expect(result.paymentStatus).toBe(
          paymentStatus === 'paid' ? 'refund-pending' : paymentStatus,
        );
        expect(result.timestamps.refundRequestedAt).toBe(
          paymentStatus === 'paid' ? 200 : undefined,
        );
        expect(result.timestamps.updatedAt).toBe(200);
        expect(initial.paymentStatus).toBe(paymentStatus);
      }
      expect(applyTransition(order(), { status: 'canceled' }, 100).timestamps.canceledAt).toBe(100);
    },
  );
});

describe('payment', () => {
  it('allows exactly unpaid -> paid -> refund-pending -> refunded', () => {
    const statuses = Object.keys(PAYMENT_TRANSITIONS) as PaymentStatus[];
    const edges = ['unpaid/paid', 'paid/refund-pending', 'refund-pending/refunded'];
    for (const from of statuses) {
      for (const to of statuses) {
        const allowed = edges.includes(`${from}/${to}`);
        expect(canTransitionPayment(from, to)).toBe(allowed);
        if (!allowed)
          expect(() => applyPaymentTransition(order({ paymentStatus: from }), to, 200)).toThrow(
            'Illegal payment',
          );
      }
    }
  });
  it('tracks payment timestamps independently and leaves input intact', () => {
    const initial = order();
    const paid = applyPaymentTransition(initial, 'paid', 200);
    const pending = applyPaymentTransition(paid, 'refund-pending', 300);
    const refunded = applyPaymentTransition(pending, 'refunded', 400);
    expect(refunded.timestamps).toEqual({
      createdAt: 100,
      updatedAt: 400,
      paidAt: 200,
      refundRequestedAt: 300,
      refundedAt: 400,
    });
    expect(refunded.fulfillmentStatus).toBe('awaiting-acceptance');
    expect(initial).toEqual(order());
    expect(() => applyPaymentTransition(initial, 'paid', 99)).toThrow('Transition time');
  });
  it.each(['canceled', 'declined'] as const)(
    'refunds late payment confirmation for %s',
    (fulfillmentStatus) => {
      const result = applyPaymentTransition(order({ fulfillmentStatus }), 'paid', 200);
      expect(result.fulfillmentStatus).toBe(fulfillmentStatus);
      expect(result.paymentStatus).toBe('refund-pending');
      expect(result.timestamps.paidAt).toBe(200);
      expect(result.timestamps.refundRequestedAt).toBe(200);
    },
  );
});

describe('menu and new-order validation', () => {
  it('provides unique purchasable seeds and complete scene metadata', () => {
    expect(new Set(seedMenu.map((entry) => entry.sku)).size).toBe(seedMenu.length);
    for (const entry of seedMenu) {
      expect(entry.scene.paletteKey).not.toBe('');
      expect(entry.scene.floatingIngredients.length).toBeGreaterThan(0);
      expect(entry.scene.imageAlt).not.toBe('');
      expect(priceDrink(entry, selections)).toBe(entry.price);
    }
  });
  it('prices optional and required choices and validates a multi-line submission', () => {
    const customizations = [
      { optionId: 'milk', choiceId: 'oat' },
      { optionId: 'sweetness', choiceId: 'less' },
    ];
    expect(priceDrink(drink, customizations)).toBe(drink.price + 50);
    const items = [item, { ...item, customizations, unitPrice: drink.price + 50, quantity: 2 }];
    expect(() => validateSubmission(items, seedMenu, { orderingPaused: false })).not.toThrow();
    expect(orderTotal(items)).toBe(1750);
    expect(orderTotal([])).toBe(0);
  });
  it.each([
    [[], 'Missing required'],
    [[...selections, ...selections], 'Duplicate'],
    [[{ optionId: 'unknown', choiceId: 'whole' }], 'Unknown customization option'],
    [[{ optionId: 'milk', choiceId: 'unknown' }], 'Unknown customization choice'],
  ] as const)('rejects invalid customization %j', (customizations, message) => {
    expect(() => priceDrink(drink, customizations)).toThrow(message);
  });
  it.each([NaN, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])('rejects invalid menu price %s', (price) => {
    expect(() => priceDrink({ ...drink, price }, selections)).toThrow('Invalid price');
  });
  it('validates ordering controls separately from existing-order transitions', () => {
    expect(() => validateSubmission([item], seedMenu, { orderingPaused: true })).toThrow('paused');
    expect(() => validateSubmission([], seedMenu, { orderingPaused: false })).toThrow(
      'at least one',
    );
    expect(() =>
      validateSubmission([{ ...item, sku: 'unknown' }], seedMenu, { orderingPaused: false }),
    ).toThrow('SKU');
    const unavailable: Drink = { ...drink, available: false };
    expect(() => validateSubmission([item], [unavailable], { orderingPaused: false })).toThrow(
      'unavailable',
    );
    expect(() =>
      validateSubmission([{ ...item, unitPrice: 1 }], seedMenu, { orderingPaused: false }),
    ).toThrow('price');
    expect(
      applyTransition(order(), { status: 'accepted-with-estimate', pickupEstimate: 300 }, 200)
        .fulfillmentStatus,
    ).toBe('accepted-with-estimate');
  });
  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid quantity %s',
    (quantity) => {
      expect(() =>
        validateSubmission([{ ...item, quantity }], seedMenu, { orderingPaused: false }),
      ).toThrow('Quantity');
    },
  );
  it.each([NaN, -1, Number.MAX_SAFE_INTEGER])('rejects invalid aggregate %s', (unitPrice) => {
    expect(() => orderTotal([{ ...item, unitPrice, quantity: 2 }])).toThrow('Invalid order total');
  });
  it('rejects total overflow even when individual quantities and prices are valid', () => {
    expect(() =>
      validateSubmission([{ ...item, quantity: Number.MAX_SAFE_INTEGER }], seedMenu, {
        orderingPaused: false,
      }),
    ).toThrow('Invalid order total');
  });
});
