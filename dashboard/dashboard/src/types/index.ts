export interface IMonthlySummary {
    month: string;
    totalIncome: number;
    totalExpenses: number;
}

export interface ICategorySummary {
    name: string;
    transactionCount: number;
    budget: number;
    expenditure: number;
}
