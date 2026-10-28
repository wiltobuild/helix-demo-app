import { describe, expect, it } from 'vitest';
import { FLAT_SHIPPING, totals, type Cart } from './cart.js';

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
});
