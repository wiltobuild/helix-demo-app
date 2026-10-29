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

export interface GiftCard {
  code: string;
  amount: Cents;
  remaining: Cents;
}

export interface Totals {
  subtotal: Cents;
  discount?: Discount;
  shipping: Cents;
  total: Cents;
  giftCard?: GiftCard;
  balanceDue?: Cents;
}

/** Orders at or above this subtotal ship free. */
export const FREE_SHIPPING_THRESHOLD: Cents = 5000;
export const FLAT_SHIPPING: Cents = 599;

export const GIFT_CARDS: Record<string, Cents> = {
  GIFT10: 1000,
  GIFT50: 5000,
};

export function subtotal(cart: Cart): Cents {
  return cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

export function totals(cart: Cart, code?: string, giftCard?: string): Totals {
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

  if (giftCard !== undefined) {
    const normalizedCode = giftCard.toUpperCase();
    if (normalizedCode.trim() === '') {
      throw new Error('Gift card code must not be empty');
    }
    if (!Object.prototype.hasOwnProperty.call(GIFT_CARDS, normalizedCode)) {
      throw new Error(`Unknown gift card code: ${normalizedCode}`);
    }

    const cardBalance = GIFT_CARDS[normalizedCode]!;
    const amountUsed = Math.min(cardBalance, result.total);
    result.giftCard = {
      code: normalizedCode,
      amount: -amountUsed,
      remaining: cardBalance - amountUsed,
    };
    result.balanceDue = result.total - amountUsed;
  }

  return result;
}
