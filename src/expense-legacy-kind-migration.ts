import type { ExpenseCategory } from './expense-category';

/**
 * Maps former detailed kind ids to the four aggregate categories (for localStorage / import).
 */
const LEGACY_KIND_TO_CATEGORY: Readonly<Record<string, ExpenseCategory>> = {
  food_groceries: 'necessary',
  household: 'necessary',
  transport: 'necessary',
  utilities_comm: 'necessary',
  housing_rent: 'necessary',
  medicine: 'necessary',
  clothing_basic: 'necessary',
  childcare: 'necessary',
  pets: 'necessary',
  taxes: 'necessary',
  other_necessary: 'necessary',
  education: 'useful',
  sport_fitness: 'useful',
  books_media: 'useful',
  hobbies: 'useful',
  professional_dev: 'useful',
  gifts: 'useful',
  charity: 'useful',
  other_useful: 'useful',
  stocks_etf: 'investments',
  bonds: 'investments',
  deposits: 'investments',
  pension: 'investments',
  crypto: 'investments',
  real_estate_inv: 'investments',
  broker_fees: 'investments',
  other_investments: 'investments',
  fastfood_cafes: 'harmful',
  delivery_food: 'harmful',
  sweets_snacks: 'harmful',
  alcohol: 'harmful',
  tobacco: 'harmful',
  impulse_shopping: 'harmful',
  entertainment: 'harmful',
  games: 'harmful',
  beauty_impulse: 'harmful',
  subscriptions: 'harmful',
  other_harmful: 'harmful',
};

/**
 * Resolves a legacy kind id to an aggregate category. Unknown ids fall back to harmful.
 */
export function legacyKindToCategory(kind: string): ExpenseCategory {
  const resolved: ExpenseCategory | undefined = LEGACY_KIND_TO_CATEGORY[kind];
  if (resolved !== undefined) {
    return resolved;
  }
  return 'harmful';
}
