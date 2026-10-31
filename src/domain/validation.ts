import type { Cents } from '../cart.js';
import type { CafeState, CustomizationSelection, Drink, Menu, OrderLineItem } from './models.js';

/** Validates selections and computes a trusted unit price from menu prices. */
export function priceDrink(drink: Drink, selections: readonly CustomizationSelection[]): Cents {
  const seen = new Set<string>();
  let price = drink.price;
  for (const selection of selections) {
    if (seen.has(selection.optionId)) throw new Error('Duplicate customization option');
    seen.add(selection.optionId);
    const option = drink.customizationOptions.find((entry) => entry.id === selection.optionId);
    if (!option) throw new Error('Unknown customization option');
    const choice = option.choices.find((entry) => entry.id === selection.choiceId);
    if (!choice) throw new Error('Unknown customization choice');
    price += choice.priceAdjustment;
  }
  for (const option of drink.customizationOptions) {
    if (option.required && !seen.has(option.id)) throw new Error('Missing required customization');
  }
  if (!Number.isSafeInteger(price) || price < 0) throw new Error('Invalid price in cents');
  return price;
}

/** Call only for NEW submissions. Pause/availability changes never block existing orders. */
export function validateSubmission(
  items: readonly OrderLineItem[],
  menu: Menu,
  cafe: CafeState,
): void {
  if (cafe.orderingPaused) throw new Error('Ordering is paused');
  if (items.length === 0) throw new Error('Order must contain at least one item');
  for (const item of items) {
    const drink = menu.find((entry) => entry.sku === item.sku);
    if (!drink) throw new Error('Unknown drink SKU');
    if (!drink.available) throw new Error('Drink is unavailable');
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
      throw new Error('Quantity must be a positive safe integer');
    }
    if (item.unitPrice !== priceDrink(drink, item.customizations)) {
      throw new Error('Item price does not match menu');
    }
  }
  orderTotal(items);
}

/** Pickup has no shipping fee. A cancellation/decline refunds this entire amount. */
export function orderTotal(items: readonly OrderLineItem[]): Cents {
  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  if (!Number.isSafeInteger(total) || total < 0) throw new Error('Invalid order total');
  return total;
}
