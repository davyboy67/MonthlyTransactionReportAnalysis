import { IReportAnalysis, ICategorySummary } from '../models/IReportAnalysis';
import { ITransaction, TransactionType } from '../models/ITransaction';
import { ITransactionInfoHandler } from '../utils/ITransactionInfoHandler';
import { CyclePayDays, IDataAnalysisService } from './IDataAnalysisService';
import { NoTransactionsInPeriodError } from '../requestResponseModels/errorModels';
import { apiClient } from './apiClient';

export const DEFAULT_PAY_DAY = 26;
const PAY_DAY_TOLERANCE_DAYS = 2;

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** Must run before `enhanceTransactionInfo`, which rewrites amounts as absolute values. */
function resolvePayDate(
  transactions: ITransaction[],
  year: number,
  monthIndex: number,
  payDay: number
): Date {
  const day = Math.min(payDay, daysInMonth(year, monthIndex));
  const expected = new Date(year, monthIndex, day);
  const from = new Date(year, monthIndex, day - PAY_DAY_TOLERANCE_DAYS);
  const to = new Date(year, monthIndex, day + PAY_DAY_TOLERANCE_DAYS, 23, 59, 59, 999);

  let best: { date: Date; amount: number; distance: number } | null = null;
  for (const transaction of transactions) {
    if (transaction.Amount <= 0) continue;

    const date = new Date(transaction.Date);
    if (date < from || date > to) continue;

    const distance = Math.abs(date.getTime() - expected.getTime());
    const better =
      !best ||
      transaction.Amount > best.amount ||
      (transaction.Amount === best.amount && distance < best.distance);
    if (better) {
      best = { date, amount: transaction.Amount, distance };
    }
  }

  const resolved = best ? best.date : expected;
  resolved.setHours(0, 0, 0, 0);
  return resolved;
}

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

  private createReportAnalysis(
    transactions: ITransaction[],
    targetMonth: number,
    targetYear: number
  ): IReportAnalysis {
    const reportAnalysis = {} as IReportAnalysis;
    reportAnalysis.CategorySummaries = [] as ICategorySummary[];

    reportAnalysis.Date = new Date(Date.UTC(targetYear, targetMonth, 0));

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

    // Income is summarised alongside the spending categories so its transactions are
    // persisted and can be broken down in the report. Consumers that only care about
    // spending filter it out by name.
    for (const category of ReportCategoryList) {
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

  async analyseTransactions(
    targetMonth: number,
    targetYear: number,
    transactions: ITransaction[],
    payDays: CyclePayDays
  ): Promise<IReportAnalysis> {
    if (transactions.length === 0) {
      return this.createReportAnalysis([], targetMonth, targetYear);
    }

    const previousMonth = new Date(targetYear, targetMonth - 2, 1);
    const reportMonth = new Date(targetYear, targetMonth - 1, 1);

    const startDate = resolvePayDate(
      transactions,
      previousMonth.getFullYear(),
      previousMonth.getMonth(),
      payDays.previousMonth
    );
    const nextPayDate = resolvePayDate(
      transactions,
      reportMonth.getFullYear(),
      reportMonth.getMonth(),
      payDays.targetMonth
    );
    const endDate = new Date(nextPayDate.getTime() - 1);

    const transactionsInRange = transactions.filter(t => {
      const d = new Date(t.Date);
      return d >= startDate && d <= endDate;
    });

    if (transactionsInRange.length === 0) {
      const dates = transactions
        .map(t => new Date(t.Date))
        .sort((a, b) => a.getTime() - b.getTime());
      throw new NoTransactionsInPeriodError(startDate, endDate, dates[0], dates[dates.length - 1]);
    }

    const enhancedTransactions = this.enhanceTransactionInfo(transactionsInRange);
    const reportAnalysis = this.createReportAnalysis(enhancedTransactions, targetMonth, targetYear);

    if (this._autoSave) {
      await apiClient.saveReportAnalysis(reportAnalysis);
    }

    return reportAnalysis;
  }
}
