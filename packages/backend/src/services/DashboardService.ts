import { IDashboardRepository } from '../repositories/DashboardRepository';
import { ReportAnalysis, DashboardDetailsResponse, Transaction } from '../models/types';
import { StatementDataObject, IStatementExtractionService, IDataAnalysisService, ITransaction } from '@transaction-report/shared';

export interface IDashboardService {
  retrieveDashboardDetails(date: Date, id?: number | null): Promise<DashboardDetailsResponse>;
  saveDashboardDetails(reportAnalysis: ReportAnalysis): Promise<void>;
  processStatementFile(fileBuffer: Buffer): Promise<ReportAnalysis>;
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

  async saveDashboardDetails(reportAnalysis: ReportAnalysis): Promise<void> {
    await this.dashboardRepository.saveDashboardDetails(reportAnalysis);
  }

  async processStatementFile(fileBuffer: Buffer): Promise<ReportAnalysis> {
    // Extract statement data from buffer
    const statementObject: StatementDataObject = {
      filePath: '',
      fileBuffer: fileBuffer
    };
    const csvData = await this.statementExtractionService.getStatementData(statementObject);

    // Compile transactions list
    const transactions: ITransaction[] = await this.statementExtractionService.compileTransactionList(csvData);

    // Analyze transactions (this also saves via apiClient)
    const reportAnalysisFromService = await this.dataAnalysisService.analyseTransactions(transactions);

    // Convert to backend format
    const reportAnalysis: ReportAnalysis = {
      Date: reportAnalysisFromService.Date,
      TotalIncome: reportAnalysisFromService.TotalIncome,
      TotalExpenses: reportAnalysisFromService.TotalExpenses,
      CategorySummaries: reportAnalysisFromService.CategorySummaries.map(summary => ({
        CategoryName: summary.CategoryName,
        Merchants: summary.Merchants,
        TotalAmount: summary.TotalAmount,
        Transactions: summary.Transactions.map(t => ({
          Date: t.date,
          Description: t.description,
          Amount: t.amount,
          Category: t.category,
          Merchant: t.merchant || '',
          Month: t.month
        }))
      }))
    };

    return reportAnalysis;
  }
}
