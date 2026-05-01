import categoryList from '../../../shared/src/data/categoryList.json';
import type { IBudgetCategory } from '@transaction-report/shared';

export const categoryDisplayName: Record<string, string> = Object.fromEntries(
  categoryList.map(cat => [cat.name, cat.displayName])
);

export function createDefaultCategories(): IBudgetCategory[] {
  return categoryList.map((cat, index) => ({
    category_id: index + 1,
    budget_id: 0,
    category_name: cat.name,
    amount: 0,
  }));
}
