import type { ICategorySummary, ITransaction } from '@transaction-report/shared';

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

export interface IncomeSource {
  name: string;
  totalAmount: number;
  percentOfIncome: number;
  transactionCount: number;
  topTransactions: TopTransaction[];
  allTransactions: TopTransaction[];
}

function toSortedTopTransactions(transactions: ITransaction[]): TopTransaction[] {
  return transactions
    .slice()
    .sort((a, b) => b.Amount - a.Amount)
    .map(t => ({
      date: new Date(t.Date),
      description: t.Description,
      amount: t.Amount,
      merchant: t.Merchant,
    }));
}

function buildIncomeSource(
  name: string,
  transactions: ITransaction[],
  totalIncome: number
): IncomeSource {
  const sortedTransactions = toSortedTopTransactions(transactions);
  const totalAmount = transactions.reduce((sum, t) => sum + t.Amount, 0);

  return {
    name,
    totalAmount,
    percentOfIncome: totalIncome > 0 ? (totalAmount / totalIncome) * 100 : 0,
    transactionCount: sortedTransactions.length,
    topTransactions: sortedTransactions.slice(0, 5),
    allTransactions: sortedTransactions,
  };
}

export function getIncomeSources(categorySummaries: ICategorySummary[]): IncomeSource[] {
  const incomeTransactions = categorySummaries
    .filter(s => s.CategoryName === 'Income')
    .flatMap(s => s.Transactions || []);

  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.Amount, 0);

  const grouped = new Map<string, ITransaction[]>();
  for (const t of incomeTransactions) {
    const name = t.Merchant || t.Description;
    const entry = grouped.get(name) ?? [];
    entry.push(t);
    grouped.set(name, entry);
  }

  return [...grouped.entries()]
    .map(([name, transactions]) => buildIncomeSource(name, transactions, totalIncome))
    .sort((a, b) => b.totalAmount - a.totalAmount);
}

export function getTopCategories(
  categorySummaries: ICategorySummary[],
  limit: number = 5
): TopCategory[] {
  const expenseCategories = categorySummaries.filter(s => s.CategoryName !== 'Income');

  const totalSpending = expenseCategories.reduce((sum, s) => sum + s.TotalAmount, 0);

  const sorted = [...expenseCategories].sort((a, b) => b.TotalAmount - a.TotalAmount);

  return sorted.slice(0, limit).map(summary => {
    const sortedTransactions = (summary.Transactions || [])
      .slice()
      .sort((a, b) => b.Amount - a.Amount)
      .map(t => ({
        date: new Date(t.Date),
        description: t.Description,
        amount: t.Amount,
        merchant: t.Merchant,
      }));

    return {
      categoryName: summary.CategoryName,
      totalAmount: summary.TotalAmount,
      percentOfTotal: totalSpending > 0 ? (summary.TotalAmount / totalSpending) * 100 : 0,
      transactionCount: summary.Transactions?.length || 0,
      topTransactions: sortedTransactions.slice(0, 5),
      allTransactions: sortedTransactions,
    };
  });
}
