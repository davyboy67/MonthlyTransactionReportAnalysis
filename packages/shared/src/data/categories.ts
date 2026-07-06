import type { IBudgetCategory } from '../models/IBudgetCategory';
import categoryList from './categoryList.json';

export interface CategoryDefinition {
  name: string;
  displayName: string;
}

/** The canonical category list (machine name + display name), single source of truth. */
export const categoryDefinitions: CategoryDefinition[] = categoryList;

/** Lookup from machine name -> display name, e.g. `categoryDisplayNames['Groceries']`. */
export const categoryDisplayNames: Record<string, string> = Object.fromEntries(
  categoryDefinitions.map(c => [c.name, c.displayName])
);

/**
 * Builds a fresh set of budget categories (one per known category, amount 0)
 * for an unsaved budget. Used by the backend default-budget response and the
 * frontend budget editor so both stay in lock-step with the category list.
 */
export function buildDefaultBudgetCategories(): IBudgetCategory[] {
  return categoryDefinitions.map((cat, index) => ({
    category_id: index + 1,
    budget_id: 0,
    category_name: cat.name,
    amount: 0,
  }));
}
