import { PrismaClient } from '@prisma/client';
import { DashboardRepository } from '../backend/src/repositories/DashboardRepository';
import { ReportAnalysis, Transaction } from '../backend/src/models/types';

// Mock PrismaClient
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    reportAnalysis: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn()
    },
    transaction: {
      create: jest.fn()
    }
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient)
  };
});

describe('DashboardRepository', () => {
  let repository: DashboardRepository;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    repository = new DashboardRepository(mockPrisma);
    jest.clearAllMocks();
  });

  describe('getDashboardDetails', () => {
    it('should retrieve dashboard details by id', async () => {
      const mockReport = {
        id: 1,
        report_date: new Date('2024-01-01'),
        total_income: 5000,
        total_expenses: 3000,
        transactions: [
          {
            id: 1,
            report_analysis_id: 1,
            date: new Date('2024-01-01'),
            description: 'Test transaction',
            amount: 100,
            category: 'Food',
            merchant: 'Test Merchant'
          }
        ]
      };

      mockPrisma.reportAnalysis.findUnique.mockResolvedValue(mockReport);

      const result = await repository.getDashboardDetails(new Date('2024-01-01'), 1);

      expect(result).not.toBeNull();
      expect(result?.TotalIncome).toBe(5000);
      expect(result?.TotalExpenses).toBe(3000);
      expect(result?.CategorySummaries).toHaveLength(1);
      expect(mockPrisma.reportAnalysis.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { transactions: true }
      });
    });

    it('should retrieve dashboard details by date', async () => {
      const mockReport = {
        id: 1,
        report_date: new Date('2024-01-01'),
        total_income: 5000,
        total_expenses: 3000,
        transactions: []
      };

      mockPrisma.reportAnalysis.findFirst.mockResolvedValue(mockReport);

      const result = await repository.getDashboardDetails(new Date('2024-01-01'));

      expect(result).not.toBeNull();
      expect(mockPrisma.reportAnalysis.findFirst).toHaveBeenCalled();
    });

    it('should return null when no report is found', async () => {
      mockPrisma.reportAnalysis.findUnique.mockResolvedValue(null);

      const result = await repository.getDashboardDetails(new Date('2024-01-01'), 1);

      expect(result).toBeNull();
    });
  });

  describe('saveDashboardDetails', () => {
    it('should save dashboard details with transactions', async () => {
      const reportAnalysis: ReportAnalysis = {
        Date: new Date('2024-01-01'),
        TotalIncome: 5000,
        TotalExpenses: 3000,
        CategorySummaries: [
          {
            CategoryName: 'Food',
            TotalAmount: 100,
            Transactions: [
              {
                Date: new Date('2024-01-01'),
                Description: 'Test',
                Amount: 100,
                Category: 'Food',
                Merchant: 'Test Merchant',
                Month: '1'
              }
            ]
          }
        ]
      };

      const mockCreatedReport = {
        id: 1,
        report_date: new Date('2024-01-01'),
        total_income: 5000,
        total_expenses: 3000
      };

      mockPrisma.reportAnalysis.create.mockResolvedValue(mockCreatedReport);
      mockPrisma.transaction.create.mockResolvedValue({});

      await repository.saveDashboardDetails(reportAnalysis);

      expect(mockPrisma.reportAnalysis.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.transaction.create).toHaveBeenCalledTimes(1);
    });
  });
});
