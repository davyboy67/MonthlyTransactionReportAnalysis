import { BudgetService } from '../src/services/BudgetService';
import { IBudgetRepository } from '../src/repositories/budgetRepository';
import { IBudget } from '@transaction-report/shared';

describe('BudgetService', () => {
  let service: BudgetService;
  let mockRepository: jest.Mocked<IBudgetRepository>;

  const mockBudget: IBudget = {
    budget_id: 1,
    user_id: 1,
    budget_month: new Date('2024-01-01'),
    notes: null,
    created_at: new Date('2024-01-01'),
    updated_at: null,
    categories: [
      { category_id: 1, budget_id: 1, category_name: 'Groceries', amount: 500 },
      { category_id: 2, budget_id: 1, category_name: 'Transport', amount: 200 },
    ],
  };

  beforeEach(() => {
    mockRepository = {
      findByUserAndMonth: jest.fn(),
      findByReportAnalysisId: jest.fn(),
      findMostRecentBudget: jest.fn(),
      saveOrUpdateBudget: jest.fn(),
    };
    service = new BudgetService(mockRepository);
  });

  describe('getBudgetForMonth', () => {
    it('should return existing budget when found', async () => {
      mockRepository.findByUserAndMonth.mockResolvedValue(mockBudget);

      const result = await service.getBudgetForMonth(1, 1, 2024);

      expect(result.budget).toEqual(mockBudget);
      expect(mockRepository.findByUserAndMonth).toHaveBeenCalledWith(1, 1, 2024);
    });

    it('should return a default budget with budget_id 0 when no budget exists', async () => {
      mockRepository.findByUserAndMonth.mockResolvedValue(null);

      const result = await service.getBudgetForMonth(1, 3, 2024);

      expect(result.budget.budget_id).toBe(0);
      expect(result.budget.user_id).toBe(1);
      expect(mockRepository.findByUserAndMonth).toHaveBeenCalledWith(1, 3, 2024);
    });

    it('should return a default budget with all 12 categories at amount 0', async () => {
      mockRepository.findByUserAndMonth.mockResolvedValue(null);

      const result = await service.getBudgetForMonth(1, 3, 2024);

      expect(result.budget.categories).toHaveLength(12);
      expect(result.budget.categories.every(cat => cat.amount === 0)).toBe(true);
      expect(result.budget.categories.every(cat => cat.budget_id === 0)).toBe(true);
    });
  });

  describe('getMostRecentBudget', () => {
    it('should return budget when one exists', async () => {
      mockRepository.findMostRecentBudget.mockResolvedValue(mockBudget);

      const result = await service.getMostRecentBudget(1);

      expect(result).toEqual(mockBudget);
      expect(mockRepository.findMostRecentBudget).toHaveBeenCalledWith(1);
    });

    it('should return null when no budget exists', async () => {
      mockRepository.findMostRecentBudget.mockResolvedValue(null);

      const result = await service.getMostRecentBudget(1);

      expect(result).toBeNull();
      expect(mockRepository.findMostRecentBudget).toHaveBeenCalledWith(1);
    });
  });

  describe('saveOrUpdateBudget', () => {
    it('should save a new budget without date validation when budget_id is 0', async () => {
      const newBudget: IBudget = {
        ...mockBudget,
        budget_id: 0,
        budget_month: new Date('2020-01-01'),
      };
      mockRepository.saveOrUpdateBudget.mockResolvedValue();

      await expect(service.saveOrUpdateBudget(newBudget)).resolves.not.toThrow();
      expect(mockRepository.saveOrUpdateBudget).toHaveBeenCalledWith(newBudget);
    });

    it('should save successfully for an existing budget in the current month', async () => {
      const now = new Date();
      const currentMonthBudget: IBudget = {
        ...mockBudget,
        budget_id: 5,
        budget_month: new Date(now.getFullYear(), now.getMonth(), 1),
      };
      mockRepository.saveOrUpdateBudget.mockResolvedValue();

      await expect(service.saveOrUpdateBudget(currentMonthBudget)).resolves.not.toThrow();
      expect(mockRepository.saveOrUpdateBudget).toHaveBeenCalledWith(currentMonthBudget);
    });

    it('should throw an error when updating an existing budget for a past month', async () => {
      const pastMonthBudget: IBudget = {
        ...mockBudget,
        budget_id: 3,
        budget_month: new Date('2024-01-01'),
      };

      await expect(service.saveOrUpdateBudget(pastMonthBudget)).rejects.toThrow(
        'Cannot modify budget after month has ended'
      );
      expect(mockRepository.saveOrUpdateBudget).not.toHaveBeenCalled();
    });

    it('should not throw for a past budget_month when budget_id is 0', async () => {
      const newBudgetPastMonth: IBudget = {
        ...mockBudget,
        budget_id: 0,
        budget_month: new Date('2024-01-01'),
      };
      mockRepository.saveOrUpdateBudget.mockResolvedValue();

      await expect(service.saveOrUpdateBudget(newBudgetPastMonth)).resolves.not.toThrow();
      expect(mockRepository.saveOrUpdateBudget).toHaveBeenCalledWith(newBudgetPastMonth);
    });
  });
});
