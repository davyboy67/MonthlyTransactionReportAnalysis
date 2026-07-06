import { IReportAnalysis, ICategorySummary } from '../models/IReportAnalysis';
import { ITransaction, TransactionType } from '../models/ITransaction';
import { ITransactionInfoHandler } from '../utils/ITransactionInfoHandler';
import { dominantMonth } from '../utils/dateUtils';
import { IDataAnalysisService } from './IDataAnalysisService';
import { apiClient } from './apiClient';

// Bank statements run on a monthly cycle ending on the 25th, so a report for a given
// month spans the 25th of the previous month to the 25th of the report month.
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

  async analyseTransactions(transactions: ITransaction[]): Promise<IReportAnalysis> {
    // No transactions means nothing to analyse — return a zeroed report rather than
    // letting dominantMonth() throw on an empty reduce.
    if (transactions.length === 0) {
      return this.createReportAnalysis([]);
    }

    // Determine target month from the transactions themselves so historical uploads work correctly.
    // This pipeline works in local time, so read the dates in local time too.
    const { month: targetMonth, year: targetYear } = dominantMonth(transactions);

    let startDate = new Date(targetYear, targetMonth - 2, STATEMENT_CYCLE_END_DAY);
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
    const reportAnalysis = this.createReportAnalysis(enhancedTransactions);

    if (this._autoSave) {
      await apiClient.saveReportAnalysis(reportAnalysis);
    }

    return reportAnalysis;
  }
}
