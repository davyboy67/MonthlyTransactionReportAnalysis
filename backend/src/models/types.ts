// API Request/Response Types matching the C# TransportModels

export interface DashboardDetailsRequest {
  Date: Date | string;
  id?: number | null;
}

export interface DashboardSaveInfoRequest {
  ReportAnalysis: ReportAnalysis;
}

export interface DashboardDetailsResponse {
  ReportAnalysis: ReportAnalysis | null;
}

export interface ReportAnalysis {
  Date: Date | string;
  TotalIncome: number;
  TotalExpenses: number;
  CategorySummaries: CategorySummary[];
}

export interface CategorySummary {
  CategoryName: string;
  Merchants?: string[];
  TotalAmount: number;
  Transactions: Transaction[];
}

export interface Transaction {
  Month: string;
  Date: Date | string;
  Description?: string;
  Amount: number;
  Category?: string;
  Merchant?: string;
}
