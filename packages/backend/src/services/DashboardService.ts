import { IDashboardRepository } from '../repositories/dashboardRepository';
import { IReferenceDataRepository } from '../repositories/referenceDataRepository';
import { DashboardDetailsResponse } from '../models/types';
import { IReportAnalysis } from '@transaction-report/shared';
import {
  StatementDataObject,
  IStatementExtractionService,
  IDataAnalysisService,
  ITransaction,
  CyclePayDays,
  EmptyStatementError,
  TransactionType,
  CategoryDefinition,
} from '@transaction-report/shared';

// Type is derived from category, never carried over: the KPI tiles sum by type while the
// breakdown groups by category, so leaving the old type behind makes the two disagree.
function resolveTypeForCategory(newCategory: string): string {
  if (newCategory === 'Income') {
    return TransactionType.Income;
  }
  if (newCategory === 'Savings') {
    return TransactionType.Savings;
  }
  return TransactionType.Expense;
}

export interface IDashboardService {
  getReportForMonth(userId: number, month: number, year: number): Promise<DashboardDetailsResponse>;
  getTrendAnalysis(userId: number, months: number): Promise<{ reports: IReportAnalysis[] }>;
  saveDashboardDetails(userId: number, reportAnalysis: IReportAnalysis): Promise<void>;
  processStatementFile(
    userId: number,
    month: number,
    year: number,
    fileBuffer: Buffer,
    payDays: CyclePayDays
  ): Promise<IReportAnalysis>;
  updateTransactionCategories(
    userId: number,
    updates: Array<{ id: number; category: string }>
  ): Promise<void>;
  getPayDays(userId: number, month: number, year: number): Promise<CyclePayDays>;
  getCategories(): Promise<CategoryDefinition[]>;
}

export class DashboardService implements IDashboardService {
  private dashboardRepository: IDashboardRepository;
  private statementExtractionService: IStatementExtractionService;
  private dataAnalysisService: IDataAnalysisService;
  private referenceDataRepository: IReferenceDataRepository;

  constructor(
    dashboardRepository: IDashboardRepository,
    statementExtractionService: IStatementExtractionService,
    dataAnalysisService: IDataAnalysisService,
    referenceDataRepository: IReferenceDataRepository
  ) {
    this.dashboardRepository = dashboardRepository;
    this.statementExtractionService = statementExtractionService;
    this.dataAnalysisService = dataAnalysisService;
    this.referenceDataRepository = referenceDataRepository;
  }

  async getCategories(): Promise<CategoryDefinition[]> {
    return this.referenceDataRepository.getCategories();
  }

  async getReportForMonth(
    userId: number,
    month: number,
    year: number
  ): Promise<DashboardDetailsResponse> {
    const reportAnalysis = await this.dashboardRepository.getReportForMonth(userId, month, year);
    return { ReportAnalysis: reportAnalysis };
  }

  async getTrendAnalysis(userId: number, months: number): Promise<{ reports: IReportAnalysis[] }> {
    const reports = await this.dashboardRepository.getLastNMonthsReports(userId, months);
    return { reports };
  }

  async saveDashboardDetails(userId: number, reportAnalysis: IReportAnalysis): Promise<void> {
    await this.dashboardRepository.saveDashboardDetails(userId, reportAnalysis);
  }

  async updateTransactionCategories(
    userId: number,
    updates: Array<{ id: number; category: string }>
  ): Promise<void> {
    const rows = await this.dashboardRepository.getTransactionsByIds(
      userId,
      updates.map(u => u.id)
    );
    const rowsById = new Map(rows.map(r => [r.id, r]));

    const applied: Array<{ id: number; category: string; type?: string }> = [];
    const reportIds = new Set<number>();

    for (const update of updates) {
      const row = rowsById.get(update.id);
      if (!row) {
        continue;
      }

      applied.push({
        id: update.id,
        category: update.category,
        type: resolveTypeForCategory(update.category),
      });
      reportIds.add(row.report_analysis_id);
    }

    if (applied.length === 0) {
      return;
    }

    await this.dashboardRepository.updateTransactionCategories(userId, applied, [...reportIds]);
  }

  async getPayDays(userId: number, month: number, year: number): Promise<CyclePayDays> {
    return this.dashboardRepository.resolvePayDays(userId, month, year);
  }

  async processStatementFile(
    userId: number,
    month: number,
    year: number,
    fileBuffer: Buffer,
    payDays: CyclePayDays
  ): Promise<IReportAnalysis> {
    const statementObject: StatementDataObject = {
      filePath: '',
      fileBuffer: fileBuffer,
    };
    const csvData = await this.statementExtractionService.getStatementData(statementObject);
    console.log('csv content extracted');

    const transactions: ITransaction[] =
      await this.statementExtractionService.compileTransactionList(csvData);
    console.log('transactions compiled');

    if (transactions.length === 0) {
      throw new EmptyStatementError();
    }

    const analysedReportAnalysis = await this.dataAnalysisService.analyseTransactions(
      month,
      year,
      transactions,
      payDays
    );
    console.log(`report analysis object compiled for ${year}-${month}`);

    await this.dashboardRepository.savePayDays(userId, month, year, payDays);

    const reportAnalysis: IReportAnalysis = {
      Date: analysedReportAnalysis.Date,
      TotalIncome: analysedReportAnalysis.TotalIncome,
      TotalExpenses: analysedReportAnalysis.TotalExpenses,
      TotalSavings: analysedReportAnalysis.TotalSavings,
      CategorySummaries: analysedReportAnalysis.CategorySummaries.map(summary => ({
        CategoryName: summary.CategoryName,
        Merchants: summary.Merchants,
        TotalAmount: summary.TotalAmount,
        Transactions: summary.Transactions.map(t => ({
          Date: t.Date,
          Description: t.Description,
          Amount: t.Amount,
          Category: t.Category,
          Merchant: t.Merchant || '',
          Month: t.Month,
          Type: t.Type,
        })),
      })),
    };

    await this.dashboardRepository.saveDashboardDetails(userId, reportAnalysis);
    console.log('report analysis persisted to db');

    return reportAnalysis;
  }
}
