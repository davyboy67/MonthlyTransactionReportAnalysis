import { DashboardService } from '../src/services/DashboardService';
import { IDashboardRepository } from '../src/repositories/dashboardRepository';
import {
  IReportAnalysis,
  IStatementExtractionService,
  IDataAnalysisService,
  TransactionType,
  EmptyStatementError,
} from '@transaction-report/shared';

describe('DashboardService', () => {
  let service: DashboardService;
  let mockRepository: jest.Mocked<IDashboardRepository>;
  let mockStatementExtractionService: jest.Mocked<IStatementExtractionService>;
  let mockDataAnalysisService: jest.Mocked<IDataAnalysisService>;

  const USER_ID = 42;
  const PAY_DAYS = { previousMonth: 26, targetMonth: 26 };

  beforeEach(() => {
    mockRepository = {
      getReportForMonth: jest.fn(),
      getReportIdForMonth: jest.fn(),
      getLastNMonthsReports: jest.fn(),
      saveDashboardDetails: jest.fn(),
      updateTransactionCategories: jest.fn(),
      resolvePayDays: jest.fn(),
      savePayDays: jest.fn(),
    };

    mockStatementExtractionService = {
      compileTransactionList: jest.fn(),
      getStatementData: jest.fn(),
      extractCsvContents: jest.fn(),
    };

    mockDataAnalysisService = {
      analyseTransactions: jest.fn(),
    };

    service = new DashboardService(
      mockRepository,
      mockStatementExtractionService,
      mockDataAnalysisService
    );
  });

  describe('getReportForMonth', () => {
    it('should delegate to the repository and wrap the result', async () => {
      const mockReport: IReportAnalysis = {
        Date: new Date('2024-03-31'),
        TotalIncome: 1,
        TotalExpenses: 2,
        TotalSavings: 3,
        CategorySummaries: [],
      };
      mockRepository.getReportForMonth.mockResolvedValue(mockReport);

      const result = await service.getReportForMonth(USER_ID, 3, 2024);

      expect(result.ReportAnalysis).toEqual(mockReport);
      expect(mockRepository.getReportForMonth).toHaveBeenCalledWith(USER_ID, 3, 2024);
    });
  });

  describe('getTrendAnalysis', () => {
    it('should return the last N months of reports', async () => {
      const reports: IReportAnalysis[] = [
        { Date: new Date('2024-01-31'), TotalIncome: 1, TotalExpenses: 0, TotalSavings: 0, CategorySummaries: [] },
        { Date: new Date('2024-02-29'), TotalIncome: 2, TotalExpenses: 0, TotalSavings: 0, CategorySummaries: [] },
      ];
      mockRepository.getLastNMonthsReports.mockResolvedValue(reports);

      const result = await service.getTrendAnalysis(USER_ID, 2);

      expect(result.reports).toEqual(reports);
      expect(mockRepository.getLastNMonthsReports).toHaveBeenCalledWith(USER_ID, 2);
    });
  });

  describe('saveDashboardDetails', () => {
    it('should pass the userId and report through to the repository', async () => {
      const mockReport: IReportAnalysis = {
        Date: new Date('2024-01-01'),
        TotalIncome: 5000,
        TotalExpenses: 3000,
        TotalSavings: 2000,
        CategorySummaries: [],
      };
      mockRepository.saveDashboardDetails.mockResolvedValue();

      await service.saveDashboardDetails(USER_ID, mockReport);

      expect(mockRepository.saveDashboardDetails).toHaveBeenCalledWith(USER_ID, mockReport);
    });
  });

  describe('updateTransactionCategories', () => {
    it('should forward the userId and updates to the repository', async () => {
      mockRepository.updateTransactionCategories.mockResolvedValue();
      const updates = [{ id: 1, category: 'Groceries' }];

      await service.updateTransactionCategories(USER_ID, updates);

      expect(mockRepository.updateTransactionCategories).toHaveBeenCalledWith(USER_ID, updates);
    });
  });

  describe('processStatementFile', () => {
    it('should run the extract -> compile -> analyse -> save pipeline and return the report', async () => {
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
        TotalSavings: 0,
        CategorySummaries: [
          {
            CategoryName: 'Food',
            Merchants: ['Supermarket'],
            TotalAmount: 50,
            Transactions: mockTransactions,
          },
        ],
      };

      mockStatementExtractionService.getStatementData.mockResolvedValue(csvData);
      mockStatementExtractionService.compileTransactionList.mockResolvedValue(mockTransactions);
      mockDataAnalysisService.analyseTransactions.mockResolvedValue(mockAnalysed);
      mockRepository.saveDashboardDetails.mockResolvedValue();

      const result = await service.processStatementFile(USER_ID, 1, 2024, Buffer.from('csv content'), PAY_DAYS);

      expect(result.TotalExpenses).toBe(50);
      expect(result.CategorySummaries[0].Transactions[0].Merchant).toBe('Supermarket');
      expect(mockStatementExtractionService.getStatementData).toHaveBeenCalledWith(
        expect.objectContaining({ fileBuffer: expect.any(Buffer) })
      );
      expect(mockStatementExtractionService.compileTransactionList).toHaveBeenCalledWith(csvData);
      expect(mockDataAnalysisService.analyseTransactions).toHaveBeenCalledWith(1, 2024, mockTransactions, PAY_DAYS);
      expect(mockRepository.savePayDays).toHaveBeenCalledWith(USER_ID, 1, 2024, PAY_DAYS);
      // the processed report is persisted, scoped to the user
      expect(mockRepository.saveDashboardDetails).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({ TotalExpenses: 50 })
      );
    });

    it('should default a missing merchant to an empty string when mapping transactions', async () => {
      const csvData = [['Date', 'Description', 'Amount']];
      const mockTransactions = [
        {
          Date: new Date('2024-01-15'),
          Description: 'Mystery',
          Amount: 20,
          Category: 'Misc',
          Merchant: undefined,
          Month: '1',
          Type: TransactionType.Expense,
        },
      ];
      const mockAnalysed: IReportAnalysis = {
        Date: new Date('2024-01-01'),
        TotalIncome: 0,
        TotalExpenses: 20,
        TotalSavings: 0,
        CategorySummaries: [
          { CategoryName: 'Misc', TotalAmount: 20, Transactions: mockTransactions },
        ],
      };

      mockStatementExtractionService.getStatementData.mockResolvedValue(csvData);
      mockStatementExtractionService.compileTransactionList.mockResolvedValue(mockTransactions);
      mockDataAnalysisService.analyseTransactions.mockResolvedValue(mockAnalysed);
      mockRepository.saveDashboardDetails.mockResolvedValue();

      const result = await service.processStatementFile(USER_ID, 1, 2024, Buffer.from('x'), PAY_DAYS);

      expect(result.CategorySummaries[0].Transactions[0].Merchant).toBe('');
    });

    it('should propagate errors from the extraction service', async () => {
      mockStatementExtractionService.getStatementData.mockRejectedValue(new Error('Parse failed'));

      await expect(
        service.processStatementFile(USER_ID, 1, 2024, Buffer.from('bad'), PAY_DAYS)
      ).rejects.toThrow('Parse failed');
    });

    it('should reject a file that yields no transactions instead of overwriting the month', async () => {
      mockStatementExtractionService.getStatementData.mockResolvedValue([['Date', 'Amount']]);
      mockStatementExtractionService.compileTransactionList.mockResolvedValue([]);

      await expect(
        service.processStatementFile(USER_ID, 1, 2024, Buffer.from('headers only'), PAY_DAYS)
      ).rejects.toThrow(EmptyStatementError);

      expect(mockDataAnalysisService.analyseTransactions).not.toHaveBeenCalled();
      expect(mockRepository.saveDashboardDetails).not.toHaveBeenCalled();
    });

    it('should not remember pay days when the upload is rejected', async () => {
      mockStatementExtractionService.getStatementData.mockResolvedValue([['Date', 'Amount']]);
      mockStatementExtractionService.compileTransactionList.mockResolvedValue([]);

      await expect(
        service.processStatementFile(USER_ID, 1, 2024, Buffer.from('x'), PAY_DAYS)
      ).rejects.toThrow();

      expect(mockRepository.savePayDays).not.toHaveBeenCalled();
    });
  });
});
