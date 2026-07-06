import { IReportAnalysis, IBudget } from "@transaction-report/shared";

export interface DashboardSaveInfoRequest {
  ReportAnalysis: IReportAnalysis;
}

export interface DashboardDetailsResponse {
  ReportAnalysis: IReportAnalysis | null;
}

export interface BudgetResponse {
  budget: IBudget;
}
