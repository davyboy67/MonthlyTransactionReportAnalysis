export interface IMonthlySummary {
    month: string;
    totalIncome: number;
    totalExpenses: number;
    totalSavings: number;
}

// A single row in the dashboard's category-breakdown chart. Named distinctly from
// the shared ICategorySummary (CategoryName/TotalAmount/Transactions) to avoid confusion.
export interface CategoryBreakdownItem {
    name: string;
    expenditure: number;
}
