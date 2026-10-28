/** Money is always whole cents, so totals never drift from floating-point rounding. */
export type Cents = number;

export interface LineItem {
  sku: string;
  name: string;
  unitPrice: Cents;
  quantity: number;
}

export interface Cart {
  items: LineItem[];
}

export interface Totals {
  subtotal: Cents;
  shipping: Cents;
  total: Cents;
}

/** Orders at or above this subtotal ship free. */
export const FREE_SHIPPING_THRESHOLD: Cents = 5000;
export const FLAT_SHIPPING: Cents = 599;

export function subtotal(cart: Cart): Cents {
  return cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

export function totals(cart: Cart): Totals {
  const sub = subtotal(cart);
  const shipping = sub === 0 || sub >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING;
  return { subtotal: sub, shipping, total: sub + shipping };
}
