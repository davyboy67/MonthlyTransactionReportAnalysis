import { IBudget, IBudgetCategory } from '@transaction-report/shared';
import { IBudgetRepository } from '../repositories/budgetRepository';
import { BudgetResponse } from '../models/types';
import categoryList from '../../../shared/src/data/categoryList.json';

export interface IBudgetService {
  getBudgetForMonth(userId: number, month: number, year: number): Promise<BudgetResponse>;
  getMostRecentBudget(userId: number): Promise<IBudget | null>;
  saveOrUpdateBudget(budget: IBudget): Promise<void>;
}

export class BudgetService implements IBudgetService {
  private budgetRepository: IBudgetRepository;

  constructor(budgetRepository: IBudgetRepository) {
    this.budgetRepository = budgetRepository;
  }

  async getBudgetForMonth(userId: number, month: number, year: number): Promise<BudgetResponse> {
    const existingBudget = await this.budgetRepository.findByUserAndMonth(userId, month, year);

    if (existingBudget) {
      return { budget: existingBudget };
    }

    const defaultCategories: IBudgetCategory[] = categoryList.map((cat, index) => ({
      category_id: index + 1,
      budget_id: 0,
      category_name: cat.name,
      amount: 0,
    }));

    const defaultBudget: IBudget = {
      budget_id: 0,
      user_id: userId,
      budget_month: new Date(year, month - 1, 1),
      notes: null,
      created_at: new Date(),
      updated_at: null,
      categories: defaultCategories,
    };

    return { budget: defaultBudget };
  }

  async getMostRecentBudget(userId: number): Promise<IBudget | null> {
    return this.budgetRepository.findMostRecentBudget(userId);
  }

  async saveOrUpdateBudget(budget: IBudget): Promise<void> {
    if (budget.budget_id > 0) {
      const budgetMonth = new Date(budget.budget_month);
      const monthEnd = new Date(budgetMonth.getFullYear(), budgetMonth.getMonth() + 1, 1);
      if (monthEnd < new Date()) {
        throw new Error('Cannot modify budget after month has ended');
      }
    }
    await this.budgetRepository.saveOrUpdateBudget(budget);
  }
}
