import type { Cents, LineItem } from '../cart.js';

/** All timestamps are Unix epoch milliseconds, supplied by the caller. */
export type Timestamp = number;
export type FulfillmentStatus =
  | 'awaiting-acceptance'
  | 'accepted-with-estimate'
  | 'ready'
  | 'collected'
  | 'canceled'
  | 'declined';
export type PaymentStatus = 'unpaid' | 'paid' | 'refund-pending' | 'refunded';
export type PaymentMethod = 'online' | 'at-pickup';

/** One choice per option; required options must be explicitly selected. */
export interface CustomizationSelection {
  optionId: string;
  choiceId: string;
}
export interface CustomizationChoice {
  id: string;
  label: string;
  priceAdjustment: Cents;
}
export interface CustomizationOption {
  id: string;
  label: string;
  required: boolean;
  choices: readonly CustomizationChoice[];
}
export interface SignatureScene {
  paletteKey: string;
  headline: string;
  imageKey: string;
  imageAlt: string;
  floatingIngredients: readonly string[];
}
export interface Drink {
  sku: LineItem['sku'];
  name: string;
  description: string;
  category: 'coffee' | 'matcha' | 'chocolate';
  price: Cents;
  available: boolean;
  scene: SignatureScene;
  customizationOptions: readonly CustomizationOption[];
}
export type Menu = readonly Drink[];
export interface CafeState {
  orderingPaused: boolean;
}
/** A price/name snapshot compatible with the existing cart, keyed by menu SKU. */
export interface OrderLineItem extends LineItem {
  customizations: readonly CustomizationSelection[];
}
export interface OrderTimestamps {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  acceptedAt?: Timestamp;
  readyAt?: Timestamp;
  collectedAt?: Timestamp;
  canceledAt?: Timestamp;
  declinedAt?: Timestamp;
  paidAt?: Timestamp;
  refundRequestedAt?: Timestamp;
  refundedAt?: Timestamp;
}
export interface Order {
  id: string;
  items: readonly OrderLineItem[];
  fulfillmentStatus: FulfillmentStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  /** Staff-set next-available pickup time, not a customer scheduling request. */
  pickupEstimate?: Timestamp;
  declineReason?: string;
  timestamps: OrderTimestamps;
  accountId?: string;
  customerName: string;
  customerPhone: string;
}
export interface Favorite {
  id: string;
  sku: LineItem['sku'];
  customizations: readonly CustomizationSelection[];
}
export interface Account {
  id: string;
  name: string;
  favorites: readonly Favorite[];
  orderHistory: readonly Order['id'][];
}
export type FulfillmentTransition =
  | { status: 'accepted-with-estimate'; pickupEstimate: Timestamp }
  | { status: 'declined'; reason: string }
  | { status: 'ready' | 'collected' | 'canceled' };
