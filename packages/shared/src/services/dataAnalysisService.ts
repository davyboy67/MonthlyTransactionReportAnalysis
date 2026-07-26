import { IReportAnalysis, ICategorySummary } from '../models/IReportAnalysis';
import { ITransaction, TransactionType } from '../models/ITransaction';
import { ITransactionInfoHandler } from '../utils/ITransactionInfoHandler';
import { IDataAnalysisService } from './IDataAnalysisService';
import { apiClient } from './apiClient';

// Bank statements run on a monthly cycle ending on the 25th (pay day), so a report for
// a given month spans the 26th of the previous month to the 25th of the report month.
const STATEMENT_CYCLE_START_DAY = 26;
const STATEMENT_CYCLE_END_DAY = 25;
// December salaries are usually paid early, so widen a January report's window back to the 13th.
const DECEMBER_PAYDAY_START_DAY = 13;
// Date's month index for December (getMonth() is 0-based).
const DECEMBER_MONTH_INDEX = 11;

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

  async analyseTransactions(
    targetMonth: number,
    targetYear: number,
    transactions: ITransaction[]
  ): Promise<IReportAnalysis> {
    if (transactions.length === 0) {
      return this.createReportAnalysis([], targetMonth, targetYear);
    }

    let startDate = new Date(targetYear, targetMonth - 2, STATEMENT_CYCLE_START_DAY);
    const endDate = new Date(targetYear, targetMonth - 1, STATEMENT_CYCLE_END_DAY, 23, 59, 59);

    // People usually get paid early in December, so widen the start for January reports
    if (startDate.getMonth() === DECEMBER_MONTH_INDEX) {
      startDate = new Date(targetYear, targetMonth - 2, DECEMBER_PAYDAY_START_DAY);
    }

    const transactionsInRange = transactions.filter(t => {
      const d = new Date(t.Date);
      return d >= startDate && d <= endDate;
    });

    const enhancedTransactions = this.enhanceTransactionInfo(transactionsInRange);
    const reportAnalysis = this.createReportAnalysis(enhancedTransactions, targetMonth, targetYear);

    if (this._autoSave) {
      await apiClient.saveReportAnalysis(reportAnalysis);
    }

    return reportAnalysis;
  }
}
