import { BudgetService } from '../src/services/BudgetService';
import { IBudgetRepository } from '../src/repositories/budgetRepository';
import { IBudget } from '@transaction-report/shared';
import { IReferenceDataRepository } from '../src/repositories/referenceDataRepository';

const CATEGORIES = [
  { name: 'Groceries', displayName: 'Groceries & Supermarkets' },
  { name: 'Transport', displayName: 'Transport & Travel' },
  { name: 'Savings', displayName: 'Savings & Investments' },
];

describe('BudgetService', () => {
  let service: BudgetService;
  let mockRepository: jest.Mocked<IBudgetRepository>;
  let mockReferenceDataRepository: jest.Mocked<IReferenceDataRepository>;

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

  // First day of the current month, in UTC, to match the service's UTC month maths.
  const currentMonthUtc = (): Date => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  };

  beforeEach(() => {
    mockRepository = {
      findByUserAndMonth: jest.fn(),
      findByReportAnalysisId: jest.fn(),
      findMostRecentBudget: jest.fn(),
      saveOrUpdateBudget: jest.fn(),
    };
    mockReferenceDataRepository = {
      getCategories: jest.fn().mockResolvedValue(CATEGORIES),
      getMerchantRules: jest.fn(),
    };
    service = new BudgetService(mockRepository, mockReferenceDataRepository);
  });

  describe('getBudgetForMonth', () => {
    it('should return the existing budget when one is found', async () => {
      mockRepository.findByUserAndMonth.mockResolvedValue(mockBudget);

      const result = await service.getBudgetForMonth(1, 1, 2024);

      expect(result.budget).toEqual(mockBudget);
      expect(mockRepository.findByUserAndMonth).toHaveBeenCalledWith(1, 1, 2024);
    });

    it('should return a default budget (id 0, scoped to the user) when none exists', async () => {
      mockRepository.findByUserAndMonth.mockResolvedValue(null);

      const result = await service.getBudgetForMonth(7, 3, 2024);

      expect(result.budget.budget_id).toBe(0);
      expect(result.budget.user_id).toBe(7);
      expect(mockRepository.findByUserAndMonth).toHaveBeenCalledWith(7, 3, 2024);
    });

    it('should seed the default budget with one zero-amount entry per known category', async () => {
      mockRepository.findByUserAndMonth.mockResolvedValue(null);

      const result = await service.getBudgetForMonth(1, 3, 2024);

      expect(result.budget.categories).toHaveLength(CATEGORIES.length);
      expect(result.budget.categories.every(cat => cat.amount === 0)).toBe(true);
      expect(result.budget.categories.every(cat => cat.budget_id === 0)).toBe(true);
      expect(result.budget.categories.map(c => c.category_name)).toEqual(
        CATEGORIES.map(c => c.name)
      );
    });

    it('should build the default budget_month as the first of the month in UTC', async () => {
      mockRepository.findByUserAndMonth.mockResolvedValue(null);

      const result = await service.getBudgetForMonth(1, 3, 2024);

      expect(result.budget.budget_month.toISOString()).toBe('2024-03-01T00:00:00.000Z');
    });
  });

  describe('getMostRecentBudget', () => {
    it('should return the budget when one exists', async () => {
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
    it('should save a brand-new budget (budget_id 0) without date validation', async () => {
      const newBudget: IBudget = {
        ...mockBudget,
        budget_id: 0,
        budget_month: new Date('2020-01-01'),
      };
      mockRepository.saveOrUpdateBudget.mockResolvedValue();

      await expect(service.saveOrUpdateBudget(newBudget)).resolves.not.toThrow();
      expect(mockRepository.saveOrUpdateBudget).toHaveBeenCalledWith(newBudget);
    });

    it('should allow updating an existing budget for the current month', async () => {
      const currentMonthBudget: IBudget = {
        ...mockBudget,
        budget_id: 5,
        budget_month: currentMonthUtc(),
      };
      mockRepository.saveOrUpdateBudget.mockResolvedValue();

      await expect(service.saveOrUpdateBudget(currentMonthBudget)).resolves.not.toThrow();
      expect(mockRepository.saveOrUpdateBudget).toHaveBeenCalledWith(currentMonthBudget);
    });

    it('should allow updating an existing budget for a future month', async () => {
      const now = new Date();
      const futureBudget: IBudget = {
        ...mockBudget,
        budget_id: 6,
        budget_month: new Date(Date.UTC(now.getUTCFullYear() + 1, now.getUTCMonth(), 1)),
      };
      mockRepository.saveOrUpdateBudget.mockResolvedValue();

      await expect(service.saveOrUpdateBudget(futureBudget)).resolves.not.toThrow();
      expect(mockRepository.saveOrUpdateBudget).toHaveBeenCalledWith(futureBudget);
    });

    it('should reject updating an existing budget whose month has already ended', async () => {
      const pastMonthBudget: IBudget = {
        ...mockBudget,
        budget_id: 3,
        budget_month: new Date('2020-01-01'),
      };

      await expect(service.saveOrUpdateBudget(pastMonthBudget)).rejects.toThrow(
        'Cannot modify budget after month has ended'
      );
      expect(mockRepository.saveOrUpdateBudget).not.toHaveBeenCalled();
    });

    it('should still allow a new budget (budget_id 0) for a past month', async () => {
      const newBudgetPastMonth: IBudget = {
        ...mockBudget,
        budget_id: 0,
        budget_month: new Date('2020-01-01'),
      };
      mockRepository.saveOrUpdateBudget.mockResolvedValue();

      await expect(service.saveOrUpdateBudget(newBudgetPastMonth)).resolves.not.toThrow();
      expect(mockRepository.saveOrUpdateBudget).toHaveBeenCalledWith(newBudgetPastMonth);
    });
  });
});
