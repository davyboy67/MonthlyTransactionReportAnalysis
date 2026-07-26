import { IDashboardRepository } from "../repositories/dashboardRepository";
import { DashboardDetailsResponse } from "../models/types";
import { IReportAnalysis } from "@transaction-report/shared";
import {
  StatementDataObject,
  IStatementExtractionService,
  IDataAnalysisService,
  ITransaction,
} from "@transaction-report/shared";

export interface IDashboardService {
  getReportForMonth(userId: number, month: number, year: number): Promise<DashboardDetailsResponse>;
  getTrendAnalysis(userId: number, months: number): Promise<{ reports: IReportAnalysis[] }>;
  saveDashboardDetails(userId: number, reportAnalysis: IReportAnalysis): Promise<void>;
  processStatementFile(userId: number, month: number, year: number, fileBuffer: Buffer): Promise<IReportAnalysis>;
  updateTransactionCategories(userId: number, updates: Array<{ id: number; category: string }>): Promise<void>;
}

export class DashboardService implements IDashboardService {
  private dashboardRepository: IDashboardRepository;
  private statementExtractionService: IStatementExtractionService;
  private dataAnalysisService: IDataAnalysisService;

  constructor(
    dashboardRepository: IDashboardRepository,
    statementExtractionService: IStatementExtractionService,
    dataAnalysisService: IDataAnalysisService,
  ) {
    this.dashboardRepository = dashboardRepository;
    this.statementExtractionService = statementExtractionService;
    this.dataAnalysisService = dataAnalysisService;
  }

  async getReportForMonth(userId: number, month: number, year: number): Promise<DashboardDetailsResponse> {
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

  async updateTransactionCategories(userId: number, updates: Array<{ id: number; category: string }>): Promise<void> {
    await this.dashboardRepository.updateTransactionCategories(userId, updates);
  }

  async processStatementFile(
    userId: number,
    month: number,
    year: number,
    fileBuffer: Buffer,
  ): Promise<IReportAnalysis> {
    const statementObject: StatementDataObject = {
      filePath: "",
      fileBuffer: fileBuffer,
    };
    const csvData =
      await this.statementExtractionService.getStatementData(statementObject);
    console.log("csv content extracted");

    const transactions: ITransaction[] =
      await this.statementExtractionService.compileTransactionList(csvData);
    console.log("transactions compiled");

    const analysedReportAnalysis =
      await this.dataAnalysisService.analyseTransactions(month, year, transactions);
    console.log(
      `report analysis object compiled for ${year}-${month}`,
    );

    const reportAnalysis: IReportAnalysis = {
      Date: analysedReportAnalysis.Date,
      TotalIncome: analysedReportAnalysis.TotalIncome,
      TotalExpenses: analysedReportAnalysis.TotalExpenses,
      TotalSavings: analysedReportAnalysis.TotalSavings,
      CategorySummaries: analysedReportAnalysis.CategorySummaries.map(
        (summary) => ({
          CategoryName: summary.CategoryName,
          Merchants: summary.Merchants,
          TotalAmount: summary.TotalAmount,
          Transactions: summary.Transactions.map((t) => ({
            Date: t.Date,
            Description: t.Description,
            Amount: t.Amount,
            Category: t.Category,
            Merchant: t.Merchant || "",
            Month: t.Month,
            Type: t.Type,
          })),
        }),
      ),
    };

    await this.dashboardRepository.saveDashboardDetails(userId, reportAnalysis);
    console.log("report analysis persisted to db");

    return reportAnalysis;
  }
}
