import { describe, expect, it } from 'vitest';
import {
  FLAT_SHIPPING,
  FREE_SHIPPING_THRESHOLD,
  GIFT_CARDS,
  loyaltyPoints,
  totals,
  type Cart,
} from './cart.js';

const mug = { sku: 'MUG', name: 'Mug', unitPrice: 1200, quantity: 2 };
const lamp = { sku: 'LAMP', name: 'Lamp', unitPrice: 4500, quantity: 1 };

describe('loyaltyPoints', () => {
  it('earns one point per whole dollar below $100, including shipping', () => {
    const result = totals({ items: [mug] });
    expect(result.total).toBe(2999);
    expect(loyaltyPoints(result)).toBe(29);
  });

  it.each([
    [9999, 99],
    [10000, 200],
    [12345, 246],
  ])('awards %i cents due the expected %i points', (unitPrice, points) => {
    const result = totals({ items: [{ ...mug, unitPrice, quantity: 1 }] });
    expect(result.total).toBe(unitPrice);
    expect(loyaltyPoints(result)).toBe(points);
  });

  it('earns zero points when a gift card fully covers the total', () => {
    const result = totals({ items: [mug] }, undefined, 'GIFT50');
    expect(result.total).toBe(2999);
    expect(result.balanceDue).toBe(0);
    expect(loyaltyPoints(result)).toBe(0);
  });

  it('uses the balance after both a discount and a gift card to determine points and doubling', () => {
    const cart: Cart = { items: [{ ...mug, unitPrice: 15000, quantity: 1 }] };
    const result = totals(cart, 'SAVE10', 'GIFT50');
    expect(result.total).toBe(13500);
    expect(result.balanceDue).toBe(8500);
    expect(loyaltyPoints(result)).toBe(85);
  });

  it('keeps points non-negative', () => {
    const result = totals({ items: [{ ...mug, unitPrice: -1000, quantity: 1 }] });
    expect(loyaltyPoints(result)).toBe(0);
  });
});

describe('totals', () => {
  it('uses a gift card to reduce the balance due while preserving the order total', () => {
    expect(totals({ items: [mug] }, undefined, 'GIFT10')).toEqual({
      subtotal: 2400,
      shipping: FLAT_SHIPPING,
      total: 2999,
      giftCard: { code: 'GIFT10', amount: -1000, remaining: 0 },
      balanceDue: 1999,
    });
  });

  it('caps gift card usage at the total and keeps the remaining card balance', () => {
    expect(totals({ items: [mug] }, undefined, 'GIFT50')).toEqual({
      subtotal: 2400,
      shipping: FLAT_SHIPPING,
      total: 2999,
      giftCard: { code: 'GIFT50', amount: -2999, remaining: 2001 },
      balanceDue: 0,
    });
  });

  it('applies a gift card after the discount and shipping', () => {
    expect(totals({ items: [mug] }, 'SAVE10', 'GIFT50')).toEqual({
      subtotal: 2400,
      discount: { code: 'SAVE10', amount: -240 },
      shipping: FLAT_SHIPPING,
      total: 2759,
      giftCard: { code: 'GIFT50', amount: -2759, remaining: 2241 },
      balanceDue: 0,
    });
  });

  it('normalizes a gift card code to upper case', () => {
    expect(totals({ items: [mug] }, undefined, 'gift10')).toEqual(
      totals({ items: [mug] }, undefined, 'GIFT10'),
    );
  });

  it.each(['', '   ', '\t\n'])('rejects an empty gift card code %j', (giftCard) => {
    expect(() => totals({ items: [mug] }, undefined, giftCard)).toThrow(
      'Gift card code must not be empty',
    );
  });

  it.each(['unknown', '__proto__'])('rejects the unknown gift card %s', (giftCard) => {
    expect(() => totals({ items: [mug] }, undefined, giftCard)).toThrow(
      `Unknown gift card code: ${giftCard.toUpperCase()}`,
    );
  });

  it('includes gift card details even when an empty cart uses none of its balance', () => {
    expect(totals({ items: [] }, undefined, 'GIFT10')).toEqual({
      subtotal: 0,
      shipping: 0,
      total: 0,
      giftCard: { code: 'GIFT10', amount: -0, remaining: GIFT_CARDS.GIFT10 },
      balanceDue: 0,
    });
  });

  it.each([undefined, 'SAVE10', 'FREESHIP'])(
    'preserves the existing result with discount %s and an undefined gift card',
    (code) => {
      const cart: Cart = { items: [mug] };
      const result = totals(cart, code, undefined);
      expect(result).toEqual(totals(cart, code));
      expect(result).not.toHaveProperty('giftCard');
      expect(result).not.toHaveProperty('balanceDue');
    },
  );

  it('adds flat shipping under the free-shipping threshold', () => {
    const cart: Cart = { items: [mug] };
    expect(totals(cart)).toEqual({ subtotal: 2400, shipping: FLAT_SHIPPING, total: 2999 });
  });

  it('ships free at or above the threshold', () => {
    const cart: Cart = { items: [mug, lamp] };
    expect(totals(cart)).toEqual({ subtotal: 6900, shipping: 0, total: 6900 });
  });

  it('charges nothing for an empty cart', () => {
    expect(totals({ items: [] })).toEqual({ subtotal: 0, shipping: 0, total: 0 });
  });

  it('rounds SAVE10 down to whole cents', () => {
    const cart: Cart = { items: [{ ...mug, unitPrice: 2999, quantity: 1 }] };
    expect(totals(cart, 'SAVE10')).toEqual({
      subtotal: 2999,
      discount: { code: 'SAVE10', amount: -299 },
      shipping: FLAT_SHIPPING,
      total: 3299,
    });
  });

  it('waives flat shipping through a FREESHIP discount', () => {
    expect(totals({ items: [mug] }, 'FREESHIP')).toEqual({
      subtotal: 2400,
      discount: { code: 'FREESHIP', amount: -FLAT_SHIPPING },
      shipping: FLAT_SHIPPING,
      total: 2400,
    });
  });

  it.each([FREE_SHIPPING_THRESHOLD, FREE_SHIPPING_THRESHOLD + 1])(
    'omits the FREESHIP discount when subtotal %i already ships free',
    (unitPrice) => {
      const cart: Cart = { items: [{ ...mug, unitPrice, quantity: 1 }] };
      expect(totals(cart, 'FREESHIP')).toEqual({
        subtotal: unitPrice,
        shipping: 0,
        total: unitPrice,
      });
      expect(totals(cart, 'FREESHIP')).not.toHaveProperty('discount');
    },
  );

  it.each(['SAVE10', 'FREESHIP'])('omits the %s discount for an empty cart', (code) => {
    const result = totals({ items: [] }, code);
    expect(result).toEqual({ subtotal: 0, shipping: 0, total: 0 });
    expect(result).not.toHaveProperty('discount');
  });

  it('rejects an unknown code', () => {
    expect(() => totals({ items: [mug] }, 'unknown')).toThrow(Error);
  });

  it.each([
    ['save10', 'SAVE10'],
    ['fReEsHiP', 'FREESHIP'],
  ])('normalizes %s to %s', (code, normalizedCode) => {
    const cart: Cart = { items: [mug] };
    const result = totals(cart, code);
    expect(result).toEqual(totals(cart, normalizedCode));
    expect(result.discount?.code).toBe(normalizedCode);
  });

  it('uses the pre-discount subtotal to qualify for free shipping', () => {
    const cart: Cart = { items: [{ ...mug, unitPrice: FREE_SHIPPING_THRESHOLD, quantity: 1 }] };
    expect(totals(cart, 'SAVE10')).toEqual({
      subtotal: FREE_SHIPPING_THRESHOLD,
      discount: { code: 'SAVE10', amount: -500 },
      shipping: 0,
      total: 4500,
    });
  });
});
