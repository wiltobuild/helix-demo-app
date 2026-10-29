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

it('shows a SAVE10 discount line between subtotal and shipping', () => {
  const text = receipt(
    { items: [{ sku: 'MUG', name: 'Mug', unitPrice: 1200, quantity: 2 }] },
    'SAVE10',
  );
  expect(text).toBe(
    [
      '2 x Mug                   $24.00',
      '--------------------------------',
      'Subtotal                  $24.00',
      'Discount (SAVE10)         -$2.40',
      'Shipping                   $5.99',
      'Total                     $27.59',
    ].join('\n'),
  );
});

it('shows a FREESHIP discount line between subtotal and shipping', () => {
  const text = receipt(
    { items: [{ sku: 'MUG', name: 'Mug', unitPrice: 1200, quantity: 2 }] },
    'FREESHIP',
  );
  expect(text).toBe(
    [
      '2 x Mug                   $24.00',
      '--------------------------------',
      'Subtotal                  $24.00',
      'Discount (FREESHIP)       -$5.99',
      'Shipping                   $5.99',
      'Total                     $24.00',
    ].join('\n'),
  );
});

it('leaves the receipt unchanged when no code is passed', () => {
  const cart = { items: [{ sku: 'MUG', name: 'Mug', unitPrice: 1200, quantity: 2 }] };
  expect(receipt(cart, undefined)).toBe(receipt(cart));
});

it('leaves the receipt unchanged when the code does not reduce the price', () => {
  // Free shipping already applies, so FREESHIP produces no discount.
  const cart = { items: [{ sku: 'MUG', name: 'Mug', unitPrice: 1200, quantity: 5 }] };
  expect(receipt(cart, 'FREESHIP')).toBe(receipt(cart));
});

it('shows gift card, balance due, and card balance lines after Total', () => {
  const text = receipt(
    { items: [{ sku: 'MUG', name: 'Mug', unitPrice: 1200, quantity: 2 }] },
    undefined,
    'GIFT10',
  );
  expect(text).toBe(
    [
      '2 x Mug                   $24.00',
      '--------------------------------',
      'Subtotal                  $24.00',
      'Shipping                   $5.99',
      'Total                     $29.99',
      'Gift card (GIFT10)       -$10.00',
      'Balance due               $19.99',
      'Card balance               $0.00',
    ].join('\n'),
  );
});

it('combines a discount code with a gift card', () => {
  const text = receipt(
    { items: [{ sku: 'MUG', name: 'Mug', unitPrice: 1200, quantity: 2 }] },
    'SAVE10',
    'GIFT10',
  );
  expect(text).toBe(
    [
      '2 x Mug                   $24.00',
      '--------------------------------',
      'Subtotal                  $24.00',
      'Discount (SAVE10)         -$2.40',
      'Shipping                   $5.99',
      'Total                     $27.59',
      'Gift card (GIFT10)       -$10.00',
      'Balance due               $17.59',
      'Card balance               $0.00',
    ].join('\n'),
  );
});

it('shows a $0.00 balance due when the gift card covers the whole total', () => {
  const text = receipt(
    { items: [{ sku: 'MUG', name: 'Mug', unitPrice: 1200, quantity: 2 }] },
    undefined,
    'GIFT50',
  );
  expect(text).toBe(
    [
      '2 x Mug                   $24.00',
      '--------------------------------',
      'Subtotal                  $24.00',
      'Shipping                   $5.99',
      'Total                     $29.99',
      'Gift card (GIFT50)       -$29.99',
      'Balance due                $0.00',
      'Card balance              $20.01',
    ].join('\n'),
  );
});

it('leaves the receipt unchanged when no gift card is passed', () => {
  const cart = { items: [{ sku: 'MUG', name: 'Mug', unitPrice: 1200, quantity: 2 }] };
  expect(receipt(cart, undefined, undefined)).toBe(receipt(cart));
});
