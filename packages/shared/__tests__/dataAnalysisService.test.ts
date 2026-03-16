import { DataAnalysisService } from '../src/services/dataAnalysisService';
import { ITransactionInfoHandler } from '../src/utils/ITransactionInfoHandler';
import { ITransaction, TransactionType } from '../src/models/ITransaction';
import { apiClient } from '../src/services/apiClient';

jest.mock('../src/services/apiClient', () => ({
  apiClient: {
    saveReportAnalysis: jest.fn().mockResolvedValue(undefined)
  }
}));

const mockedSave = apiClient.saveReportAnalysis as jest.MockedFunction<typeof apiClient.saveReportAnalysis>;

describe('DataAnalysisService', () => {
  let mockHandler: jest.Mocked<ITransactionInfoHandler>;

  const makeTransaction = (overrides: Partial<ITransaction> = {}): ITransaction => ({
    Date: new Date('2026-02-10'),
    Description: 'Test transaction',
    Amount: -50,
    Category: '',
    Merchant: '',
    Month: '2',
    Type: TransactionType.Expense,
    ...overrides
  });

  beforeEach(() => {
    mockHandler = {
      resolveMerchant: jest.fn().mockReturnValue(undefined),
      resolveCategory: jest.fn().mockReturnValue('Groceries')
    };
    jest.clearAllMocks();
  });

  // For March 15 2026: getDay()=0 (Sunday) < 9 so range is Jan 26 – Feb 25 2026
  describe('analyseTransactions - standard range (March 15 2026)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-15'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should include transactions within the date range', async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const tx = makeTransaction({ Date: new Date('2026-02-10'), Amount: -50 });

      const result = await service.analyseTransactions([tx]);

      expect(result.TotalExpenses).toBe(50);
    });

    it('should exclude transactions before the start of the range', async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const tx = makeTransaction({ Date: new Date('2026-01-20') });

      const result = await service.analyseTransactions([tx]);

      expect(result.TotalExpenses).toBe(0);
      expect(result.TotalIncome).toBe(0);
    });

    it('should exclude transactions after the end of the range', async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const tx = makeTransaction({ Date: new Date('2026-03-01') });

      const result = await service.analyseTransactions([tx]);

      expect(result.TotalExpenses).toBe(0);
    });

    it('should assign Income type to positive amount transactions', async () => {
      const service = new DataAnalysisService(mockHandler, false);
      mockHandler.resolveCategory.mockReturnValue('Income');
      const tx = makeTransaction({ Amount: 5000 });

      const result = await service.analyseTransactions([tx]);

      expect(result.TotalIncome).toBe(5000);
      expect(result.TotalExpenses).toBe(0);
    });

    it('should assign Expense type and convert to absolute amount for negative transactions', async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const tx = makeTransaction({ Amount: -120.5 });

      const result = await service.analyseTransactions([tx]);

      expect(result.TotalExpenses).toBe(120.5);
      expect(result.TotalIncome).toBe(0);
    });

    it('should assign Savings type when resolveCategory sets Type to Savings', async () => {
      const service = new DataAnalysisService(mockHandler, false);
      mockHandler.resolveCategory.mockImplementation((t) => {
        t.Type = TransactionType.Savings;
        return 'Savings';
      });
      const tx = makeTransaction({ Amount: -200 });

      const result = await service.analyseTransactions([tx]);

      expect(result.TotalSavings).toBe(200);
      expect(result.TotalExpenses).toBe(0);
    });

    it('should round totals to 2 decimal places', async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const tx = makeTransaction({ Amount: -33.333 });

      const result = await service.analyseTransactions([tx]);

      expect(result.TotalExpenses).toBe(33.33);
    });

    it('should group transactions into CategorySummaries by category', async () => {
      const service = new DataAnalysisService(mockHandler, false);
      mockHandler.resolveCategory
        .mockReturnValueOnce('Food')
        .mockReturnValueOnce('Transport');
      const tx1 = makeTransaction({ Amount: -50, Description: 'Grocery store' });
      const tx2 = makeTransaction({ Amount: -30, Description: 'Uber' });

      const result = await service.analyseTransactions([tx1, tx2]);

      expect(result.CategorySummaries).toHaveLength(2);
      expect(result.CategorySummaries.map(s => s.CategoryName)).toContain('Food');
      expect(result.CategorySummaries.map(s => s.CategoryName)).toContain('Transport');
    });

    it('should exclude Income category from CategorySummaries', async () => {
      const service = new DataAnalysisService(mockHandler, false);
      mockHandler.resolveCategory.mockReturnValue('Income');
      const tx = makeTransaction({ Amount: 5000 });

      const result = await service.analyseTransactions([tx]);

      expect(result.CategorySummaries).toHaveLength(0);
      expect(result.TotalIncome).toBe(5000);
    });

    it('should sum amounts correctly within a category', async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const tx1 = makeTransaction({ Amount: -50, Description: 'Shop A' });
      const tx2 = makeTransaction({ Amount: -30, Description: 'Shop B' });

      const result = await service.analyseTransactions([tx1, tx2]);

      expect(result.CategorySummaries[0].TotalAmount).toBe(80);
      expect(result.CategorySummaries[0].Transactions).toHaveLength(2);
    });

    it('should populate Merchants in CategorySummaries when merchant is resolved', async () => {
      const service = new DataAnalysisService(mockHandler, false);
      mockHandler.resolveMerchant.mockReturnValue('Woolworths');
      const tx = makeTransaction({ Amount: -50, Description: 'WOOLWORTHS FOOD' });

      const result = await service.analyseTransactions([tx]);

      expect(result.CategorySummaries[0].Merchants).toContain('Woolworths');
    });

    it('should call resolveMerchant with the transaction description', async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const tx = makeTransaction({ Description: 'PICK N PAY STORE' });

      await service.analyseTransactions([tx]);

      expect(mockHandler.resolveMerchant).toHaveBeenCalledWith('PICK N PAY STORE');
    });

    it('should call resolveCategory for each transaction', async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const tx1 = makeTransaction({ Description: 'Shop A' });
      const tx2 = makeTransaction({ Description: 'Shop B' });

      await service.analyseTransactions([tx1, tx2]);

      expect(mockHandler.resolveCategory).toHaveBeenCalledTimes(2);
    });

    it('should return zeroed totals and empty summaries when no transactions are in range', async () => {
      const service = new DataAnalysisService(mockHandler, false);

      const result = await service.analyseTransactions([]);

      expect(result.TotalIncome).toBe(0);
      expect(result.TotalExpenses).toBe(0);
      expect(result.TotalSavings).toBe(0);
      expect(result.CategorySummaries).toHaveLength(0);
    });

    it('should call apiClient.saveReportAnalysis when autoSave is true', async () => {
      mockedSave.mockResolvedValue(undefined);
      const service = new DataAnalysisService(mockHandler, true);
      const tx = makeTransaction();

      await service.analyseTransactions([tx]);

      expect(mockedSave).toHaveBeenCalledTimes(1);
      expect(mockedSave).toHaveBeenCalledWith(expect.objectContaining({ TotalExpenses: 50 }));
    });

    it('should not call apiClient.saveReportAnalysis when autoSave is false', async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const tx = makeTransaction();

      await service.analyseTransactions([tx]);

      expect(mockedSave).not.toHaveBeenCalled();
    });

    it('should set autoSave to true by default', async () => {
      mockedSave.mockResolvedValue(undefined);
      const service = new DataAnalysisService(mockHandler); // no autoSave arg
      const tx = makeTransaction();

      await service.analyseTransactions([tx]);

      expect(mockedSave).toHaveBeenCalledTimes(1);
    });
  });

  // For January 15 2026: startDate falls in Dec (month 11) so range is Dec 13 2025 – Jan 25 2026
  describe('analyseTransactions - January range (December pay day special case)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-15'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should include transactions from Dec 13 onwards', async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const tx = makeTransaction({ Date: new Date('2025-12-20'), Amount: -100 });

      const result = await service.analyseTransactions([tx]);

      expect(result.TotalExpenses).toBe(100);
    });

    it('should exclude transactions before Dec 13', async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const tx = makeTransaction({ Date: new Date('2025-12-10'), Amount: -100 });

      const result = await service.analyseTransactions([tx]);

      expect(result.TotalExpenses).toBe(0);
    });

    it('should include transactions up to Jan 25', async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const tx = makeTransaction({ Date: new Date('2026-01-20'), Amount: -75 });

      const result = await service.analyseTransactions([tx]);

      expect(result.TotalExpenses).toBe(75);
    });

    it('should exclude transactions after Jan 25', async () => {
      const service = new DataAnalysisService(mockHandler, false);
      const tx = makeTransaction({ Date: new Date('2026-01-30'), Amount: -75 });

      const result = await service.analyseTransactions([tx]);

      expect(result.TotalExpenses).toBe(0);
    });
  });
});
