import { IBudget, IBudgetCategory } from '@transaction-report/shared';
import { Budget } from 'src/entities/Budget';
import { BudgetCategory } from 'src/entities/BudgetCategory';
import { ReportAnalysis } from 'src/entities/ReportAnalysis';
import { Users } from 'src/entities/Users';
import { DataSource, Repository } from 'typeorm';

export interface IBudgetRepository {
  findByUserAndMonth(userId: number, month: number, year: number): Promise<IBudget | null>;
  findByReportAnalysisId(reportAnalysisId: number): Promise<IBudget | null>;
  findMostRecentBudget(userId: number): Promise<IBudget | null>;
  saveOrUpdateBudget(budget: IBudget): Promise<void>;
}

export class BudgetRepository implements IBudgetRepository {
  private budgetRepository: Repository<Budget>;
  private userRepository: Repository<Users>;
  private reportAnalysisRepository: Repository<ReportAnalysis>;
  private budgetCategoryRepository: Repository<BudgetCategory>;

  constructor(dataSource: DataSource) {
    this.budgetRepository = dataSource.getRepository(Budget);
    this.userRepository = dataSource.getRepository(Users);
    this.reportAnalysisRepository = dataSource.getRepository(ReportAnalysis);
    this.budgetCategoryRepository = dataSource.getRepository(BudgetCategory);
  }

  async findMostRecentBudget(userId: number): Promise<IBudget | null> {
    const budget = await this.budgetRepository.findOne({
      where: { user_id: userId },
      order: { budget_month: 'DESC' },
      relations: ['categories'],
    });
    return budget ? this.convertBudget(budget) : null;
  }

  async saveOrUpdateBudget(budget: IBudget): Promise<void> {
    try {
      const raw = new Date(budget.budget_month);
      const budgetMonth = new Date(Date.UTC(raw.getUTCFullYear(), raw.getUTCMonth(), 1));

      if (budget.budget_id === 0) {
        const savedBudget = await this.budgetRepository.save({
          user_id: budget.user_id,
          budget_month: budgetMonth,
          notes: budget.notes,
          created_at: new Date(),
          updated_at: null,
        });

        const categoryRecords = budget.categories.map(cat => ({
          budget_id: savedBudget.budget_id,
          category_name: cat.category_name,
          amount: cat.amount,
        }));

        if (categoryRecords.length > 0) {
          await this.budgetCategoryRepository.save(categoryRecords);
        }
      } else {
        await this.budgetRepository.save({
          budget_id: budget.budget_id,
          user_id: budget.user_id,
          budget_month: budgetMonth,
          notes: budget.notes,
          updated_at: new Date(),
        });

        await this.budgetCategoryRepository.delete({ budget_id: budget.budget_id });

        const categoryRecords = budget.categories.map(cat => ({
          budget_id: budget.budget_id,
          category_name: cat.category_name,
          amount: cat.amount,
        }));

        if (categoryRecords.length > 0) {
          await this.budgetCategoryRepository.save(categoryRecords);
        }
      }
    } catch (error) {
      throw new Error(`Error saving budget: ${error}`);
    }
  }

  async findByUserAndMonth(userId: number, month: number, year: number): Promise<IBudget | null> {
    try {
      const budgetDate = new Date(Date.UTC(year, month - 1, 1));

      const user = await this.userRepository.findOne({
        where: { user_id: userId },
        relations: ['budgets', 'budgets.categories'],
      });

      if (!user) {
        throw new Error('User not found');
      }

      const budgets = [...(user?.budgets || [])];

      const entityBudget = budgets.find(
        b => new Date(b.budget_month).getTime() === budgetDate.getTime()
      );
      return entityBudget ? this.convertBudget(entityBudget) : null;
    } catch (error) {
      throw new Error(`Error fetching budgets: ${error}`);
    }
  }

  async findByReportAnalysisId(reportAnalysisId: number): Promise<IBudget | null> {
    const report = await this.reportAnalysisRepository.findOne({
      where: { id: reportAnalysisId },
      relations: ['budget', 'budget.categories'],
    });

    if (!report) {
      return null;
    }

    const budget = report.budget;
    if (!budget) {
      return null;
    }

    return this.convertBudget(budget);
  }

  private convertBudgetCategories(categories: BudgetCategory[]): IBudgetCategory[] {
    return (
      categories?.map(category => ({
        category_id: category.category_id,
        budget_id: category.budget_id,
        category_name: category.category_name,
        amount: Number(category.amount),
      })) || []
    );
  }

  private convertBudget(budget: Budget): IBudget {
    return {
      budget_id: budget.budget_id,
      user_id: budget.user_id,
      budget_month: budget.budget_month,
      notes: budget.notes,
      created_at: budget.created_at,
      updated_at: budget.updated_at,
      categories: this.convertBudgetCategories(budget.categories),
    };
  }
}
