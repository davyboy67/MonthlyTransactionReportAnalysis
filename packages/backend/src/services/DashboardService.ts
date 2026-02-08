import { IDashboardRepository } from '../repositories/DashboardRepository';
import { DashboardDetailsResponse } from '../models/types';
import { IReportAnalysis } from '@transaction-report/shared';
import { StatementDataObject, IStatementExtractionService, IDataAnalysisService, ITransaction } from '@transaction-report/shared';

export interface IDashboardService {
  retrieveDashboardDetails(date?: Date, id?: number | null): Promise<DashboardDetailsResponse>;
  saveDashboardDetails(reportAnalysis: IReportAnalysis): Promise<void>;
  processStatementFile(fileBuffer: Buffer): Promise<IReportAnalysis>;
}

export class DashboardService implements IDashboardService {
  private dashboardRepository: IDashboardRepository;
  private statementExtractionService: IStatementExtractionService;
  private dataAnalysisService: IDataAnalysisService;

  constructor(
    dashboardRepository: IDashboardRepository,
    statementExtractionService: IStatementExtractionService,
    dataAnalysisService: IDataAnalysisService
  ) {
    this.dashboardRepository = dashboardRepository;
    this.statementExtractionService = statementExtractionService;
    this.dataAnalysisService = dataAnalysisService;
  }

  async retrieveDashboardDetails(date: Date, id?: number | null): Promise<DashboardDetailsResponse> {
    const reportAnalysis = await this.dashboardRepository.getDashboardDetails(date, id);
    
    return {
      ReportAnalysis: reportAnalysis
    };
  }

  async saveDashboardDetails(reportAnalysis: IReportAnalysis): Promise<void> {
    await this.dashboardRepository.saveDashboardDetails(reportAnalysis);
  }

  async processStatementFile(fileBuffer: Buffer): Promise<IReportAnalysis> {
    const statementObject: StatementDataObject = {
      filePath: '',
      fileBuffer: fileBuffer
    };
    const csvData = await this.statementExtractionService.getStatementData(statementObject);

    const transactions: ITransaction[] = await this.statementExtractionService.compileTransactionList(csvData);

    const reportAnalysisFromService = await this.dataAnalysisService.analyseTransactions(transactions);

    const reportAnalysis: IReportAnalysis = {
      Date: reportAnalysisFromService.Date,
      TotalIncome: reportAnalysisFromService.TotalIncome,
      TotalExpenses: reportAnalysisFromService.TotalExpenses,
      CategorySummaries: reportAnalysisFromService.CategorySummaries.map(summary => ({
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
          Type: t.Type
        }))
      }))
    };

    return reportAnalysis;
  }
}
