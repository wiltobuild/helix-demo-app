import { describe, expect, it } from 'vitest';
import { FLAT_SHIPPING, FREE_SHIPPING_THRESHOLD, totals, type Cart } from './cart.js';

const mug = { sku: 'MUG', name: 'Mug', unitPrice: 1200, quantity: 2 };
const lamp = { sku: 'LAMP', name: 'Lamp', unitPrice: 4500, quantity: 1 };

describe('totals', () => {
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
