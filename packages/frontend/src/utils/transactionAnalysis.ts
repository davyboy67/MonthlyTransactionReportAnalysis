import type { ICategorySummary } from "@transaction-report/shared";

export interface TopTransaction {
  date: Date;
  description: string;
  amount: number;
  merchant?: string;
}

export interface TopCategory {
  categoryName: string;
  totalAmount: number;
  percentOfTotal: number;
  transactionCount: number;
  topTransactions: TopTransaction[];
  allTransactions: TopTransaction[];
}

export function getTopCategories(
  categorySummaries: ICategorySummary[],
  limit: number = 5,
): TopCategory[] {
  const expenseCategories = categorySummaries.filter(
    (s) => s.CategoryName !== "Income",
  );

  const totalSpending = expenseCategories.reduce(
    (sum, s) => sum + s.TotalAmount,
    0,
  );

  const sorted = [...expenseCategories].sort(
    (a, b) => b.TotalAmount - a.TotalAmount,
  );

  return sorted.slice(0, limit).map((summary) => {
    const sortedTransactions = (summary.Transactions || [])
      .slice()
      .sort((a, b) => b.Amount - a.Amount)
      .map((t) => ({
        date: new Date(t.Date),
        description: t.Description,
        amount: t.Amount,
        merchant: t.Merchant,
      }));

    return {
      categoryName: summary.CategoryName,
      totalAmount: summary.TotalAmount,
      percentOfTotal:
        totalSpending > 0 ? (summary.TotalAmount / totalSpending) * 100 : 0,
      transactionCount: summary.Transactions?.length || 0,
      topTransactions: sortedTransactions.slice(0, 5),
      allTransactions: sortedTransactions,
    };
  });
}
