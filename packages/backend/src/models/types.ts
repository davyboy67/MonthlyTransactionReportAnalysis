import { IReportAnalysis } from "@transaction-report/shared";

export interface DashboardDetailsRequest {
  Date: Date;
  id?: number | null;
}

export interface DashboardSaveInfoRequest {
  ReportAnalysis: IReportAnalysis;
}

export interface DashboardDetailsResponse {
  ReportAnalysis: IReportAnalysis | null;
}
