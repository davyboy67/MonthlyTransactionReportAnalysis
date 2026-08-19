import { DashboardRepository } from '../src/repositories/dashboardRepository';
import { ReportAnalysis as ReportAnalysisEntity } from '../src/entities/ReportAnalysis';
import { Transaction as TransactionEntity } from '../src/entities/Transaction';
import {
  IReportAnalysis,
  TransactionType,
} from '@transaction-report/shared';

describe('DashboardRepository', () => {
  let repository: DashboardRepository;
  let mockDataSource: any;
  let mockReportAnalysisRepo: any;
  let mockTransactionRepo: any;
  let mockQueryBuilder: any;

  const USER_ID = 42;

  beforeEach(() => {
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    mockReportAnalysisRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };

    mockTransactionRepo = {
      save: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };

    mockDataSource = {
      getRepository: jest.fn(entity => {
        if (entity === ReportAnalysisEntity) return mockReportAnalysisRepo;
        if (entity === TransactionEntity) return mockTransactionRepo;
      }),
      query: jest.fn().mockResolvedValue([]),
    };

    repository = new DashboardRepository(mockDataSource);
  });

  describe('getReportForMonth / getReportIdForMonth', () => {
    it('should query by month boundaries scoped to the user and convert the result', async () => {
      mockQueryBuilder.getOne.mockResolvedValue({
        id: 7,
        report_date: new Date('2024-03-31'),
        total_income: 100,
        total_expenses: 50,
        total_savings: 50,
        transactions: [],
      });

      const result = await repository.getReportForMonth(USER_ID, 3, 2024);

      expect(result?.TotalIncome).toBe(100);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('r.user_id = :userId', {
        userId: USER_ID,
      });
    });

    it('should return null from getReportForMonth when nothing matches', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const result = await repository.getReportForMonth(USER_ID, 3, 2024);

      expect(result).toBeNull();
    });

    it('should return the report id from getReportIdForMonth', async () => {
      mockQueryBuilder.getOne.mockResolvedValue({
        id: 7,
        report_date: new Date('2024-03-31'),
        total_income: 0,
        total_expenses: 0,
        total_savings: 0,
        transactions: [],
      });

      const id = await repository.getReportIdForMonth(USER_ID, 3, 2024);

      expect(id).toBe(7);
    });

    it('should return null id when no report exists for the month', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const id = await repository.getReportIdForMonth(USER_ID, 3, 2024);

      expect(id).toBeNull();
    });
  });

  describe('getLastNMonthsReports', () => {
    it('should return reports in chronological (ascending) order', async () => {
      // repository fetches DESC then reverses to ascending
      mockReportAnalysisRepo.find.mockResolvedValue([
        { id: 3, report_date: new Date('2024-03-31'), total_income: 3, total_expenses: 0, total_savings: 0, transactions: [] },
        { id: 2, report_date: new Date('2024-02-29'), total_income: 2, total_expenses: 0, total_savings: 0, transactions: [] },
        { id: 1, report_date: new Date('2024-01-31'), total_income: 1, total_expenses: 0, total_savings: 0, transactions: [] },
      ]);

      const result = await repository.getLastNMonthsReports(USER_ID, 3);

      expect(result.map(r => r.TotalIncome)).toEqual([1, 2, 3]);
      expect(mockReportAnalysisRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user_id: USER_ID },
          order: { report_date: 'DESC' },
          take: 3,
        })
      );
    });
  });

  describe('saveDashboardDetails', () => {
    const reportAnalysis: IReportAnalysis = {
      Date: new Date('2024-01-15'),
      TotalIncome: 5000,
      TotalExpenses: 3000,
      TotalSavings: 2000,
      CategorySummaries: [
        {
          CategoryName: 'Food',
          TotalAmount: 100,
          Transactions: [
            {
              Date: new Date('2024-01-15'),
              Description: 'Test',
              Amount: 100,
              Category: 'Food',
              Merchant: 'Test Merchant',
              Month: '1',
              Type: TransactionType.Expense,
            },
          ],
        },
      ],
    };

    it('should create a new report and persist transactions scoped to the user', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null); // no existing report for the month
      mockReportAnalysisRepo.save.mockResolvedValue({ id: 1 });
      mockTransactionRepo.save.mockResolvedValue({});

      await repository.saveDashboardDetails(USER_ID, reportAnalysis);

      expect(mockReportAnalysisRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: USER_ID,
          total_income: 5000,
          total_expenses: 3000,
          total_savings: 2000,
        })
      );
      const savedTx = mockTransactionRepo.save.mock.calls[0][0];
      expect(savedTx).toHaveLength(1);
      expect(savedTx[0]).toEqual(
        expect.objectContaining({
          report_analysis_id: 1,
          user_id: USER_ID,
          amount: 100,
          category: 'Food',
        })
      );
    });

    it('should overwrite transactions when a report already exists for the month', async () => {
      mockQueryBuilder.getOne.mockResolvedValue({ id: 55 }); // existing report
      mockReportAnalysisRepo.save.mockResolvedValue({ id: 55 });
      mockTransactionRepo.delete.mockResolvedValue({});
      mockTransactionRepo.save.mockResolvedValue({});

      await repository.saveDashboardDetails(USER_ID, reportAnalysis);

      expect(mockTransactionRepo.delete).toHaveBeenCalledWith({ report_analysis_id: 55 });
      expect(mockReportAnalysisRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 55 })
      );
    });
  });

  describe('updateTransactionCategories', () => {
    it('should update each transaction scoped to the user', async () => {
      mockTransactionRepo.update.mockResolvedValue({});

      await repository.updateTransactionCategories(USER_ID, [
        { id: 1, category: 'Groceries' },
        { id: 2, category: 'Transport' },
      ]);

      expect(mockTransactionRepo.update).toHaveBeenCalledTimes(2);
      expect(mockTransactionRepo.update).toHaveBeenCalledWith(
        { id: 1, user_id: USER_ID },
        { category: 'Groceries' }
      );
      expect(mockTransactionRepo.update).toHaveBeenCalledWith(
        { id: 2, user_id: USER_ID },
        { category: 'Transport' }
      );
    });

    it('should also write the type when the caller supplies one', async () => {
      mockTransactionRepo.update.mockResolvedValue({});

      await repository.updateTransactionCategories(USER_ID, [
        { id: 1, category: 'Savings', type: 'Savings' },
      ]);

      expect(mockTransactionRepo.update).toHaveBeenCalledWith(
        { id: 1, user_id: USER_ID },
        { category: 'Savings', type: 'Savings' }
      );
    });

    it('should recompute the stored report totals for the affected reports', async () => {
      mockTransactionRepo.update.mockResolvedValue({});

      await repository.updateTransactionCategories(
        USER_ID,
        [{ id: 1, category: 'Savings', type: 'Savings' }],
        [7]
      );

      const [sql, params] = mockDataSource.query.mock.calls[0];
      expect(sql).toContain('UPDATE reportanalysis');
      expect(params).toEqual([USER_ID, [7]]);
    });

    it('should not touch report totals when no report ids are given', async () => {
      mockTransactionRepo.update.mockResolvedValue({});

      await repository.updateTransactionCategories(USER_ID, [{ id: 1, category: 'Groceries' }]);

      expect(mockDataSource.query).not.toHaveBeenCalled();
    });
  });

  describe('getTransactionsByIds', () => {
    it('should scope the lookup to the user', async () => {
      mockTransactionRepo.find.mockResolvedValue([
        { id: 1, type: 'Expense', report_analysis_id: 7 },
      ]);

      const rows = await repository.getTransactionsByIds(USER_ID, [1]);

      expect(mockTransactionRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ user_id: USER_ID }) })
      );
      expect(rows).toEqual([{ id: 1, type: 'Expense', report_analysis_id: 7 }]);
    });

    it('should not query at all for an empty id list', async () => {
      expect(await repository.getTransactionsByIds(USER_ID, [])).toEqual([]);
      expect(mockTransactionRepo.find).not.toHaveBeenCalled();
    });
  });

});
