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

export interface Discount {
  code: string;
  amount: Cents;
}

export interface Totals {
  subtotal: Cents;
  discount?: Discount;
  shipping: Cents;
  total: Cents;
}

/** Orders at or above this subtotal ship free. */
export const FREE_SHIPPING_THRESHOLD: Cents = 5000;
export const FLAT_SHIPPING: Cents = 599;

export function subtotal(cart: Cart): Cents {
  return cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

export function totals(cart: Cart, code?: string): Totals {
  const sub = subtotal(cart);
  const shipping = sub === 0 || sub >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING;
  const result: Totals = { subtotal: sub, shipping, total: sub + shipping };

  if (code !== undefined) {
    const normalizedCode = code.toUpperCase();
    let amount: Cents;
    switch (normalizedCode) {
      case 'SAVE10':
        amount = -Math.floor(sub * 0.1);
        break;
      case 'FREESHIP':
        amount = -shipping;
        break;
      default:
        throw new Error(`Unknown discount code: ${normalizedCode}`);
    }

    if (amount < 0) {
      result.discount = { code: normalizedCode, amount };
      result.total += amount;
    }
  }

  return result;
}
