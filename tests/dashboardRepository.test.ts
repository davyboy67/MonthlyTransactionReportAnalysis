import { DataSource, Repository } from 'typeorm';
import { DashboardRepository } from '../backend/src/repositories/DashboardRepository';
import { ReportAnalysis, Transaction } from '../backend/src/models/types';
import { ReportAnalysis as ReportAnalysisEntity } from '../backend/src/entities/ReportAnalysis';
import { Transaction as TransactionEntity } from '../backend/src/entities/Transaction';

jest.mock('typeorm', () => {
  const actualTypeORM = jest.requireActual('typeorm');
  return {
    ...actualTypeORM,
    DataSource: jest.fn().mockImplementation(() => ({
      getRepository: jest.fn()
    }))
  };
});

describe('DashboardRepository', () => {
  let repository: DashboardRepository;
  let mockDataSource: any;
  let mockReportAnalysisRepo: any;
  let mockTransactionRepo: any;

  beforeEach(() => {
    mockReportAnalysisRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn()
    };

    mockTransactionRepo = {
      save: jest.fn()
    };

    mockDataSource = {
      getRepository: jest.fn((entity) => {
        if (entity === ReportAnalysisEntity) {
          return mockReportAnalysisRepo;
        }
        if (entity === TransactionEntity) {
          return mockTransactionRepo;
        }
      })
    };

    repository = new DashboardRepository(mockDataSource);
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

      mockReportAnalysisRepo.findOne.mockResolvedValue(mockReport);

      const result = await repository.getDashboardDetails(new Date('2024-01-01'), 1);

      expect(result).not.toBeNull();
      expect(result?.TotalIncome).toBe(5000);
      expect(result?.TotalExpenses).toBe(3000);
      expect(result?.CategorySummaries).toHaveLength(1);
      expect(mockReportAnalysisRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['transactions']
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

      mockReportAnalysisRepo.find.mockResolvedValue([mockReport]);

      const result = await repository.getDashboardDetails(new Date('2024-01-01'));

      expect(result).not.toBeNull();
      expect(mockReportAnalysisRepo.find).toHaveBeenCalled();
    });

    it('should return null when no report is found', async () => {
      mockReportAnalysisRepo.findOne.mockResolvedValue(null);

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

      mockReportAnalysisRepo.save.mockResolvedValue(mockCreatedReport);
      mockTransactionRepo.save.mockResolvedValue({});

      await repository.saveDashboardDetails(reportAnalysis);

      expect(mockReportAnalysisRepo.save).toHaveBeenCalledTimes(1);
      expect(mockTransactionRepo.save).toHaveBeenCalledTimes(1);
    });
  });
});
