import { IReportAnalysis, ITransactionSummaryItem } from "../models/IReportAnalysis";
import { ITransaction } from "../models/ITransaction";
import { ITransactionInfoHandler } from "../utils/ITransactionInfoHandler";
import { IDataAnalysisService } from "./IDataAnalysisService";
import { apiClient } from "./apiClient";

export class DataAnalysisService implements IDataAnalysisService {
  private readonly _transactionInfoHandler: ITransactionInfoHandler;

  constructor(transactionInfoHandler: ITransactionInfoHandler) {
    this._transactionInfoHandler = transactionInfoHandler;
  }

  private enhanceTransactionInfo(transactions: ITransaction[]): ITransaction[] {
    transactions.forEach((transaction) => {
      const merchant = this._transactionInfoHandler.resolveMerchant(transaction.Description);
      //first populate with merchant info
      if (merchant) {
        transaction.Merchant = merchant;
      }

      //then enhance with category info
      const category = this._transactionInfoHandler.resolveCategory(transaction);
      if (!category) {
        throw new Error(`Could not resolve category for transaction: ${transaction.Description}`);
      }
      transaction.Category = category;
    });

    return transactions;
  }

  private createReportAnalysis(transactions: ITransaction[]): IReportAnalysis {
    let reportAnalysis = {} as IReportAnalysis;
    reportAnalysis.CategorySummaries = [] as ITransactionSummaryItem[];

    reportAnalysis.Date = new Date();

    const totalIncome = transactions.filter(t => t.Amount > 0).reduce((sum, t) => sum + t.Amount, 0)
    const totalExpenses = transactions.filter(t => t.Amount < 0).reduce((sum, t) => sum + t.Amount, 0)

    reportAnalysis.TotalExpenses = Math.round(totalExpenses * 100) / 100;
    reportAnalysis.TotalIncome = Math.round(totalIncome * 100) / 100;

    let ReportCategoryList = [...new Set(transactions.map(t => t.Category))];


    for (const category of ReportCategoryList) {
      const categoryTransactions = transactions.filter(t => t.Category === category);
      const categoryMerchants = categoryTransactions.map(t => t.Merchant).filter(m => m !== undefined && m !== "") as string[];
      let summaryItem = {} as ITransactionSummaryItem;

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
    
    let startDate = new Date(currentYear, currentMonth -1, 26);
    const endDate = new Date(currentYear, currentMonth, 25, 23, 59, 59);
    
    //people usually get paid early in December
    if (startDate.getMonth() == 11) {
      startDate = new Date(currentYear, currentMonth -1, 13);
    }

    //we only are interested in the transactions for the month of the report, prevents db duplicates as well
    const transactionsInRange = transactions.filter(t => {
      const transactionDate = new Date(t.Date);
      return transactionDate >= startDate && transactionDate <= endDate;
    });

    let enhancedTransactions = this.enhanceTransactionInfo(transactionsInRange);
    let reportAnalysis = this.createReportAnalysis(enhancedTransactions);

    await apiClient.saveReportAnalysis(reportAnalysis);

    return reportAnalysis;

    //investigate the resend api
  }
}