import { IReportAnalysis, ICategorySummary } from '../models/IReportAnalysis';
import { ITransaction, TransactionType } from '../models/ITransaction';
import { ITransactionInfoHandler } from '../utils/ITransactionInfoHandler';
import { IDataAnalysisService } from './IDataAnalysisService';
import { apiClient } from './apiClient';

export class DataAnalysisService implements IDataAnalysisService {
  private readonly _transactionInfoHandler: ITransactionInfoHandler;
  private readonly _autoSave: boolean;

  constructor(transactionInfoHandler: ITransactionInfoHandler, autoSave: boolean = true) {
    this._transactionInfoHandler = transactionInfoHandler;
    this._autoSave = autoSave;
  }

  private enhanceTransactionInfo(transactions: ITransaction[]): ITransaction[] {
    transactions.forEach(transaction => {
      const merchant = this._transactionInfoHandler.resolveMerchant(transaction.Description);
      if (merchant) {
        transaction.Merchant = merchant;
      }

      transaction.Type = transaction.Amount >= 0 ? TransactionType.Income : TransactionType.Expense;
      const category = this._transactionInfoHandler.resolveCategory(transaction);
      if (!category) {
        throw new Error(`Could not resolve category for transaction: ${transaction.Description}`);
      }
      transaction.Category = category;
      if (category === 'Savings') {
        transaction.Type = TransactionType.Savings;
      }

      transaction.Amount = Math.abs(transaction.Amount);
    });

    return transactions;
  }

  private createReportAnalysis(transactions: ITransaction[]): IReportAnalysis {
    const reportAnalysis = {} as IReportAnalysis;
    reportAnalysis.CategorySummaries = [] as ICategorySummary[];

    reportAnalysis.Date = new Date();

    const totalIncome = transactions
      .filter(t => t.Type === TransactionType.Income)
      .reduce((sum, t) => sum + t.Amount, 0);
    const totalExpenses = transactions
      .filter(t => t.Type === TransactionType.Expense)
      .reduce((sum, t) => sum + t.Amount, 0);
    const totalSavings = transactions
      .filter(t => t.Type === TransactionType.Savings)
      .reduce((sum, t) => sum + t.Amount, 0);

    reportAnalysis.TotalExpenses = Math.round(totalExpenses * 100) / 100;
    reportAnalysis.TotalIncome = Math.round(totalIncome * 100) / 100;
    reportAnalysis.TotalSavings = Math.round(totalSavings * 100) / 100;

    const ReportCategoryList = [...new Set(transactions.map(t => t.Category))];

    for (const category of ReportCategoryList) {
      if (category === 'Income') {
        continue;
      }

      const categoryTransactions = transactions.filter(t => t.Category === category);
      const categoryMerchants = categoryTransactions
        .map(t => t.Merchant)
        .filter(m => m !== undefined && m !== '') as string[];
      const summaryItem = {} as ICategorySummary;

      summaryItem.CategoryName = category;
      if (categoryMerchants.length > 0) {
        summaryItem.Merchants = categoryMerchants;
      }
      summaryItem.TotalAmount =
        Math.round(categoryTransactions.reduce((sum, t) => sum + t.Amount, 0) * 100) / 100;
      summaryItem.Transactions = categoryTransactions;
      reportAnalysis.CategorySummaries.push(summaryItem);
    }

    return reportAnalysis;
  }

  private dominantMonth(transactions: ITransaction[]): { month: number; year: number } {
    const counts = new Map<string, { month: number; year: number; count: number }>();
    for (const t of transactions) {
      const d = new Date(t.Date);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const key = `${y}-${m}`;
      const entry = counts.get(key) ?? { month: m, year: y, count: 0 };
      counts.set(key, { ...entry, count: entry.count + 1 });
    }
    return [...counts.values()].reduce((a, b) => (b.count > a.count ? b : a));
  }

  async analyseTransactions(transactions: ITransaction[]): Promise<IReportAnalysis> {
    // No transactions means nothing to analyse — return a zeroed report rather than
    // letting dominantMonth() throw on an empty reduce.
    if (transactions.length === 0) {
      return this.createReportAnalysis([]);
    }

    // Determine target month from the transactions themselves so historical uploads work correctly
    const { month: targetMonth, year: targetYear } = this.dominantMonth(transactions);

    let startDate = new Date(targetYear, targetMonth - 2, 25);
    const endDate = new Date(targetYear, targetMonth - 1, 25, 23, 59, 59);

    // People usually get paid early in December, so widen the start for January reports
    if (startDate.getMonth() === 11) {
      startDate = new Date(targetYear, targetMonth - 2, 13);
    }

    const transactionsInRange = transactions.filter(t => {
      const d = new Date(t.Date);
      return d >= startDate && d <= endDate;
    });

    const enhancedTransactions = this.enhanceTransactionInfo(transactionsInRange);
    const reportAnalysis = this.createReportAnalysis(enhancedTransactions);

    if (this._autoSave) {
      await apiClient.saveReportAnalysis(reportAnalysis);
    }

    return reportAnalysis;
  }
}
