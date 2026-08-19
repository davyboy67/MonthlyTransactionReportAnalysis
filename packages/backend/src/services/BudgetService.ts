import { IBudget, buildDefaultBudgetCategories } from '@transaction-report/shared';
import { IBudgetRepository } from '../repositories/budgetRepository';
import { IReferenceDataRepository } from '../repositories/referenceDataRepository';
import { BudgetResponse } from '../models/types';

export interface IBudgetService {
  getBudgetForMonth(userId: number, month: number, year: number): Promise<BudgetResponse>;
  getMostRecentBudget(userId: number): Promise<IBudget | null>;
  saveOrUpdateBudget(budget: IBudget): Promise<void>;
}

export class BudgetService implements IBudgetService {
  private budgetRepository: IBudgetRepository;
  private referenceDataRepository: IReferenceDataRepository;

  constructor(
    budgetRepository: IBudgetRepository,
    referenceDataRepository: IReferenceDataRepository
  ) {
    this.budgetRepository = budgetRepository;
    this.referenceDataRepository = referenceDataRepository;
  }

  async getBudgetForMonth(userId: number, month: number, year: number): Promise<BudgetResponse> {
    const existingBudget = await this.budgetRepository.findByUserAndMonth(userId, month, year);

    if (existingBudget) {
      return { budget: existingBudget };
    }

    const defaultBudget: IBudget = {
      budget_id: 0,
      user_id: userId,
      budget_month: new Date(Date.UTC(year, month - 1, 1)),
      notes: null,
      created_at: new Date(),
      updated_at: null,
      categories: buildDefaultBudgetCategories(await this.referenceDataRepository.getCategories()),
    };

    return { budget: defaultBudget };
  }

  async getMostRecentBudget(userId: number): Promise<IBudget | null> {
    return this.budgetRepository.findMostRecentBudget(userId);
  }

  async saveOrUpdateBudget(budget: IBudget): Promise<void> {
    if (budget.budget_id > 0) {
      const budgetMonth = new Date(budget.budget_month);
      const monthEnd = new Date(Date.UTC(budgetMonth.getUTCFullYear(), budgetMonth.getUTCMonth() + 1, 1));
      if (monthEnd < new Date()) {
        throw new Error('Cannot modify budget after month has ended');
      }
    }
    await this.budgetRepository.saveOrUpdateBudget(budget);
  }
}
