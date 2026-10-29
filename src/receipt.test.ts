import { expect, it } from 'vitest';
import { formatCents, receipt } from './receipt.js';

it('formats cents as dollars', () => {
  expect(formatCents(599)).toBe('$5.99');
  expect(formatCents(-150)).toBe('-$1.50');
});

it('prints items and totals', () => {
  const text = receipt({ items: [{ sku: 'MUG', name: 'Mug', unitPrice: 1200, quantity: 2 }] });
  expect(text).toBe(
    [
      '2 x Mug                   $24.00',
      '--------------------------------',
      'Subtotal                  $24.00',
      'Shipping                   $5.99',
      'Total                     $29.99',
    ].join('\n'),
  );
});

it('prints a receipt for an empty cart', () => {
  const text = receipt({ items: [] });
  expect(text).toBe(
    [
      '--------------------------------',
      'Subtotal                   $0.00',
      'Shipping                    FREE',
      'Total                      $0.00',
    ].join('\n'),
  );
});
