import type { IBudgetCategory } from '../models/IBudgetCategory';

export interface CategoryDefinition {
  name: string;
  displayName: string;
}

export function categoryDisplayName(categories: CategoryDefinition[], name: string): string {
  return categories.find(c => c.name === name)?.displayName ?? name;
}

export function buildDefaultBudgetCategories(categories: CategoryDefinition[]): IBudgetCategory[] {
  return categories.map((cat, index) => ({
    category_id: index + 1,
    budget_id: 0,
    category_name: cat.name,
    amount: 0,
  }));
}
