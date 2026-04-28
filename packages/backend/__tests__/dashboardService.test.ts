import { DashboardService } from '../src/services/DashboardService';
import { IDashboardRepository } from '../src/repositories/dashboardRepository';
import {
  IReportAnalysis,
  IStatementExtractionService,
  IDataAnalysisService,
  TransactionType,
} from '@transaction-report/shared';

describe('DashboardService', () => {
  let service: DashboardService;
  let mockRepository: jest.Mocked<IDashboardRepository>;
  let mockstatementExtractionService: jest.Mocked<IStatementExtractionService>;
  let mockdataAnalysisService: jest.Mocked<IDataAnalysisService>;

  beforeEach(() => {
    mockRepository = {
      getDashboardDetails: jest.fn(),
      saveDashboardDetails: jest.fn(),
    };

    mockstatementExtractionService = {
      compileTransactionList: jest.fn(),
      getStatementData: jest.fn(),
      extractCsvContents: jest.fn(),
    };

    mockdataAnalysisService = {
      analyseTransactions: jest.fn(),
    };
    service = new DashboardService(
      mockRepository,
      mockstatementExtractionService,
      mockdataAnalysisService
    );
  });

  describe('retrieveDashboardDetails', () => {
    it('should return dashboard details response', async () => {
      const mockReport: IReportAnalysis = {
        Date: new Date('2024-01-01'),
        TotalIncome: 5000,
        TotalExpenses: 3000,
        TotalSavings: 2000,
        CategorySummaries: [],
      };

      mockRepository.getDashboardDetails.mockResolvedValue(mockReport);

      const result = await service.retrieveDashboardDetails(new Date('2024-01-01'));

      expect(result.ReportAnalysis).toEqual(mockReport);
      expect(mockRepository.getDashboardDetails).toHaveBeenCalledWith(
        new Date('2024-01-01'),
        undefined
      );
    });

    it('should pass id parameter correctly', async () => {
      mockRepository.getDashboardDetails.mockResolvedValue(null);

      await service.retrieveDashboardDetails(new Date('2024-01-01'), 1);

      expect(mockRepository.getDashboardDetails).toHaveBeenCalledWith(new Date('2024-01-01'), 1);
    });

    it('should return null ReportAnalysis when no report exists', async () => {
      mockRepository.getDashboardDetails.mockResolvedValue(null);

      const result = await service.retrieveDashboardDetails();

      expect(result.ReportAnalysis).toBeNull();
      expect(mockRepository.getDashboardDetails).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  describe('saveDashboardDetails', () => {
    it('should save dashboard details', async () => {
      const mockReport: IReportAnalysis = {
        Date: new Date('2024-01-01'),
        TotalIncome: 5000,
        TotalExpenses: 3000,
        TotalSavings: 2000,
        CategorySummaries: [],
      };

      mockRepository.saveDashboardDetails.mockResolvedValue();

      await service.saveDashboardDetails(mockReport);

      expect(mockRepository.saveDashboardDetails).toHaveBeenCalledWith(mockReport);
    });
  });

  describe('processStatementFile', () => {
    it('should process a file buffer and return a report analysis', async () => {
      const csvData = [
        ['Date', 'Description', 'Amount'],
        ['2024-01-15', 'Groceries', '50'],
      ];
      const mockTransactions = [
        {
          Date: new Date('2024-01-15'),
          Description: 'Groceries',
          Amount: 50,
          Category: 'Food',
          Merchant: 'Supermarket',
          Month: '1',
          Type: TransactionType.Expense,
        },
      ];
      const mockAnalysed: IReportAnalysis = {
        Date: new Date('2024-01-01'),
        TotalIncome: 0,
        TotalExpenses: 50,
        TotalSavings: -50,
        CategorySummaries: [
          {
            CategoryName: 'Food',
            Merchants: ['Supermarket'],
            TotalAmount: 50,
            Transactions: mockTransactions,
          },
        ],
      };

      mockstatementExtractionService.getStatementData.mockResolvedValue(csvData);
      mockstatementExtractionService.compileTransactionList.mockResolvedValue(mockTransactions);
      mockdataAnalysisService.analyseTransactions.mockResolvedValue(mockAnalysed);

      const result = await service.processStatementFile(Buffer.from('csv content'));

      expect(result.TotalIncome).toBe(0);
      expect(result.TotalExpenses).toBe(50);
      expect(result.TotalSavings).toBe(-50);
      expect(result.CategorySummaries).toHaveLength(1);
      expect(result.CategorySummaries[0].Transactions[0].Merchant).toBe('Supermarket');
      expect(mockstatementExtractionService.getStatementData).toHaveBeenCalledWith(
        expect.objectContaining({ fileBuffer: expect.any(Buffer) })
      );
      expect(mockstatementExtractionService.compileTransactionList).toHaveBeenCalledWith(csvData);
      expect(mockdataAnalysisService.analyseTransactions).toHaveBeenCalledWith(mockTransactions);
    });

    it('should propagate errors from extraction service', async () => {
      mockstatementExtractionService.getStatementData.mockRejectedValue(new Error('Parse failed'));

      await expect(service.processStatementFile(Buffer.from('bad'))).rejects.toThrow(
        'Parse failed'
      );
    });
  });
});
