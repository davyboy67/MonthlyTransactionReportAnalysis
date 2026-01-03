import { IReportAnalysis, ITransactionSummaryItem } from "../models/IReportAnalysis";
import { ITransaction } from "../models/ITransaction";
import { IReportAnalysisRepo } from "../repository/IReportAnalysisRepo";
import { ITransactionInfoHandler } from "../utils/ITransactionInfoHandler";
import { TransactionInfoHandler } from "../utils/TransactionInfoHandler";
import { IDataAnalysisService } from "./IDataAnalysisService";

export class DataAnalysisService implements IDataAnalysisService {
  private readonly _transactionInfoHandler: ITransactionInfoHandler;
  private readonly _reportAnalysisRepo: IReportAnalysisRepo;

  constructor(transactionInfoHandler: ITransactionInfoHandler, reportAnalysisRepo: IReportAnalysisRepo) {
    this._transactionInfoHandler = transactionInfoHandler;
    this._reportAnalysisRepo = reportAnalysisRepo;
  }

  private enhanceTransactionInfo(transactions: ITransaction[]): ITransaction[] {
    transactions.forEach((transaction) => {
      const merchant = this._transactionInfoHandler.resolveMerchant(transaction.description);
      //first populate with merchant info
      if (merchant) {
        transaction.merchant = merchant;
      }

      //then enhance with category info
      const category = this._transactionInfoHandler.resolveCategory(transaction);
      if (!category) {
        throw new Error(`Could not resolve category for transaction: ${transaction.description}`);
      }
      transaction.category = category;
    });

    return transactions;
  }

  private createReportAnalysis(transactions: ITransaction[]): IReportAnalysis {
    let reportAnalysis = {} as IReportAnalysis;
    reportAnalysis.categorySummary = [] as ITransactionSummaryItem[];

    reportAnalysis.date = new Date();

    const totalIncome = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
    const totalExpenses = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)

    reportAnalysis.totalExpenses = Math.round(totalExpenses * 100) / 100;
    reportAnalysis.totalIncome = Math.round(totalIncome * 100) / 100;

    let ReportCategoryList = [...new Set(transactions.map(t => t.category))];


    for (const category of ReportCategoryList) {
      const categoryTransactions = transactions.filter(t => t.category === category);
      const categoryMerchants = categoryTransactions.map(t => t.merchant).filter(m => m !== undefined && m !== "") as string[];
      let summaryItem = {} as ITransactionSummaryItem;

      summaryItem.category = category;
      if (categoryMerchants.length > 0) {
        summaryItem.merchants = categoryMerchants;
      }
      summaryItem.totalAmount = Math.round(categoryTransactions.reduce((sum, t) => sum + t.amount, 0) * 100) / 100;
      summaryItem.transactions = categoryTransactions;
      reportAnalysis.categorySummary.push(summaryItem);
    }

    return reportAnalysis;
  }

  async analyseTransactions(transactions: ITransaction[]): Promise<IReportAnalysis> {
    //first enhance each transaction with merchant and category info
    let enhancedTransactions = this.enhanceTransactionInfo(transactions);

    let reportAnalysis =this.createReportAnalysis(enhancedTransactions);
    await this._reportAnalysisRepo.saveReportAnalysis(reportAnalysis);

    return reportAnalysis;
  }
}