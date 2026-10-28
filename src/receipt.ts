import { totals, type Cart, type Cents } from './cart.js';

export function formatCents(cents: Cents): string {
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

const WIDTH = 32;

function line(label: string, amount: string): string {
  return label + amount.padStart(WIDTH - label.length);
}

/** A plain-text receipt, one line per item, then the totals. */
export function receipt(cart: Cart, code?: string): string {
  const t = totals(cart, code);
  const lines = cart.items.map((item) =>
    line(`${item.quantity} x ${item.name}`, formatCents(item.unitPrice * item.quantity)),
  );
  lines.push('-'.repeat(WIDTH));
  lines.push(line('Subtotal', formatCents(t.subtotal)));
  if (t.discount) {
    lines.push(line(`Discount (${t.discount.code})`, formatCents(t.discount.amount)));
  }
  lines.push(line('Shipping', t.shipping === 0 ? 'FREE' : formatCents(t.shipping)));
  lines.push(line('Total', formatCents(t.total)));
  return lines.join('\n');
}
