import { IReportAnalysis, ICategorySummary } from "../models/IReportAnalysis";
import { ITransaction, TransactionType } from "../models/ITransaction";
import { ITransactionInfoHandler } from "../utils/ITransactionInfoHandler";
import { IDataAnalysisService } from "./IDataAnalysisService";
import { apiClient } from "./apiClient";

export class DataAnalysisService implements IDataAnalysisService {
  private readonly _transactionInfoHandler: ITransactionInfoHandler;
  private readonly _autoSave: boolean;

  constructor(transactionInfoHandler: ITransactionInfoHandler, autoSave: boolean = true) {
    this._transactionInfoHandler = transactionInfoHandler;
    this._autoSave = autoSave;
  }

  private enhanceTransactionInfo(transactions: ITransaction[]): ITransaction[] {
    transactions.forEach((transaction) => {
      const merchant = this._transactionInfoHandler.resolveMerchant(transaction.Description);
      //first populate with merchant info
      if (merchant) {
        transaction.Merchant = merchant;
      }

      transaction.Type = transaction.Amount >= 0 ? TransactionType.Income : TransactionType.Expense;
      //then enhance with category info
      const category = this._transactionInfoHandler.resolveCategory(transaction);
      if (!category) {
        throw new Error(`Could not resolve category for transaction: ${transaction.Description}`);
      }
      transaction.Category = category;
      if (category === "Savings") {
        transaction.Type = TransactionType.Savings;
      }

      transaction.Amount = Math.abs(transaction.Amount);
    });

    return transactions;
  }

  private createReportAnalysis(transactions: ITransaction[]): IReportAnalysis {
    let reportAnalysis = {} as IReportAnalysis;
    reportAnalysis.CategorySummaries = [] as ICategorySummary[];

    reportAnalysis.Date = new Date();

    const totalIncome = transactions.filter(t => t.Type === TransactionType.Income).reduce((sum, t) => sum + t.Amount, 0)
    const totalExpenses = transactions.filter(t => t.Type === TransactionType.Expense).reduce((sum, t) => sum + t.Amount, 0)
    const totalSavings = transactions.filter(t => t.Type === TransactionType.Savings).reduce((sum, t) => sum + t.Amount, 0)

    reportAnalysis.TotalExpenses = Math.round(totalExpenses * 100) / 100;
    reportAnalysis.TotalIncome = Math.round(totalIncome * 100) / 100;
    reportAnalysis.TotalSavings = Math.round(totalSavings * 100) / 100;

    let ReportCategoryList = [...new Set(transactions.map(t => t.Category))];


    for (const category of ReportCategoryList) {
      if (category === "Income") {
        continue;
      }

      const categoryTransactions = transactions.filter(t => t.Category === category);
      const categoryMerchants = categoryTransactions.map(t => t.Merchant).filter(m => m !== undefined && m !== "") as string[];
      let summaryItem = {} as ICategorySummary;

      summaryItem.CategoryName = category;
      if (categoryMerchants.length > 0) {
        summaryItem.Merchants = categoryMerchants;
      }
      summaryItem.TotalAmount = Math.round(categoryTransactions.reduce((sum, t) => sum + t.Amount, 0) * 100) / 100;
      summaryItem.Transactions = categoryTransactions;
      reportAnalysis.CategorySummaries.push(summaryItem);
    }

    return reportAnalysis;
  }

  async analyseTransactions(transactions: ITransaction[]): Promise<IReportAnalysis> {
    //filter relevant transactions then enhance each transaction with merchant and category info
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDay();
    
    let startDate = new Date(currentYear, currentMonth -1, 26);
    let endDate = new Date(currentYear, currentMonth, 25, 23, 59, 59);
    
    //people usually get paid early in December
    if (startDate.getMonth() == 11) {
      startDate = new Date(currentYear, currentMonth -1, 13);
    }
    else if (currentDay < 9) { //start of a new month, we actually want the analysis of the month that just ended
      startDate.setMonth(currentMonth - 2);
      endDate.setMonth(currentMonth - 1);
    }

    //we only are interested in the transactions for the month of the report, prevents db duplicates as well
    const transactionsInRange = transactions.filter(t => {
      const transactionDate = new Date(t.Date);
      return transactionDate >= startDate && transactionDate <= endDate;
    });

    let enhancedTransactions = this.enhanceTransactionInfo(transactionsInRange);
    let reportAnalysis = this.createReportAnalysis(enhancedTransactions);

    if (this._autoSave) {
      await apiClient.saveReportAnalysis(reportAnalysis);
    }

    return reportAnalysis;

    //investigate the resend api
  }
}