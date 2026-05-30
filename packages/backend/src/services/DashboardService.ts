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
  retrieveDashboardDetails(
    date?: Date,
    id?: number | null,
  ): Promise<DashboardDetailsResponse>;
  getReportForMonth(month: number, year: number): Promise<DashboardDetailsResponse>;
  getTrendAnalysis(months: number): Promise<{ reports: IReportAnalysis[] }>;
  saveDashboardDetails(reportAnalysis: IReportAnalysis): Promise<void>;
  processStatementFile(fileBuffer: Buffer): Promise<IReportAnalysis>;
  updateTransactionCategories(updates: Array<{ id: number; category: string }>): Promise<void>;
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

  async retrieveDashboardDetails(
    date?: Date,
    id?: number | null,
  ): Promise<DashboardDetailsResponse> {
    const reportAnalysis = await this.dashboardRepository.getDashboardDetails(
      date,
      id,
    );

    return {
      ReportAnalysis: reportAnalysis,
    };
  }

  async getReportForMonth(month: number, year: number): Promise<DashboardDetailsResponse> {
    const reportAnalysis = await this.dashboardRepository.getReportForMonth(1, month, year);
    return { ReportAnalysis: reportAnalysis };
  }

  async getTrendAnalysis(months: number): Promise<{ reports: IReportAnalysis[] }> {
    const reports = await this.dashboardRepository.getLastNMonthsReports(1, months);
    return { reports };
  }

  async saveDashboardDetails(reportAnalysis: IReportAnalysis): Promise<void> {
    await this.dashboardRepository.saveDashboardDetails(reportAnalysis);
  }

  async updateTransactionCategories(updates: Array<{ id: number; category: string }>): Promise<void> {
    await this.dashboardRepository.updateTransactionCategories(updates);
  }

  async processStatementFile(fileBuffer: Buffer): Promise<IReportAnalysis> {
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
      await this.dataAnalysisService.analyseTransactions(transactions);
    console.log(
      `report analysis object compiled for date: ${analysedReportAnalysis.Date}`,
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

    await this.dashboardRepository.saveDashboardDetails(reportAnalysis);
    console.log("report analysis persisted to db");

    return reportAnalysis;
  }
}
