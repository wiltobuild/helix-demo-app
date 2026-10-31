import type { CustomizationOption, Menu } from './models.js';

const milk: CustomizationOption = {
  id: 'milk',
  label: 'Milk',
  required: true,
  choices: [
    { id: 'whole', label: 'Whole milk', priceAdjustment: 0 },
    { id: 'oat', label: 'Oat milk', priceAdjustment: 50 },
  ],
};
const sweetness: CustomizationOption = {
  id: 'sweetness',
  label: 'Sweetness',
  required: false,
  choices: [
    { id: 'regular', label: 'Regular', priceAdjustment: 0 },
    { id: 'less', label: 'Less sweet', priceAdjustment: 0 },
  ],
};

/** Illustrative seed menu from the approved concept, not a confirmed cafe menu. */
export const seedMenu: Menu = [
  {
    sku: 'brown-sugar-latte',
    name: 'Brown sugar iced latte',
    description: 'Espresso, milk, and a little caramel warmth over ice.',
    category: 'coffee',
    price: 550,
    available: true,
    scene: {
      paletteKey: 'tangerine',
      headline: 'A little daily magic.',
      imageKey: 'brown-sugar-latte',
      imageAlt: 'Iced latte with swirling milk and espresso',
      floatingIngredients: ['coffee-bean', 'ice', 'brown-sugar'],
    },
    customizationOptions: [milk, sweetness],
  },
  {
    sku: 'cloud-matcha',
    name: 'Cloud matcha',
    description: 'Matcha and milk, lightly sweetened and poured over ice.',
    category: 'matcha',
    price: 550,
    available: true,
    scene: {
      paletteKey: 'matcha-green',
      headline: 'Your green daydream.',
      imageKey: 'cloud-matcha',
      imageAlt: 'Iced green matcha latte with a soft milk cloud',
      floatingIngredients: ['matcha-powder', 'ice'],
    },
    customizationOptions: [milk, sweetness],
  },
  {
    sku: 'dark-chocolate-mocha',
    name: 'Dark chocolate mocha',
    description: 'Espresso, dark chocolate, and silky steamed milk.',
    category: 'chocolate',
    price: 550,
    available: true,
    scene: {
      paletteKey: 'lavender',
      headline: 'Take the rich route.',
      imageKey: 'dark-chocolate-mocha',
      imageAlt: 'Chocolate mocha topped with a soft layer of foam',
      floatingIngredients: ['chocolate-piece', 'coffee-bean'],
    },
    customizationOptions: [milk, sweetness],
  },
];
