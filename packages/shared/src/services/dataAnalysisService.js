"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataAnalysisService = void 0;
const apiClient_1 = require("./apiClient");
class DataAnalysisService {
    constructor(transactionInfoHandler) {
        this._transactionInfoHandler = transactionInfoHandler;
    }
    enhanceTransactionInfo(transactions) {
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
    createReportAnalysis(transactions) {
        let reportAnalysis = {};
        reportAnalysis.CategorySummaries = [];
        reportAnalysis.Date = new Date();
        const totalIncome = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0);
        reportAnalysis.TotalExpenses = Math.round(totalExpenses * 100) / 100;
        reportAnalysis.TotalIncome = Math.round(totalIncome * 100) / 100;
        let ReportCategoryList = [...new Set(transactions.map(t => t.category))];
        for (const category of ReportCategoryList) {
            const categoryTransactions = transactions.filter(t => t.category === category);
            const categoryMerchants = categoryTransactions.map(t => t.merchant).filter(m => m !== undefined && m !== "");
            let summaryItem = {};
            summaryItem.CategoryName = category;
            if (categoryMerchants.length > 0) {
                summaryItem.Merchants = categoryMerchants;
            }
            summaryItem.TotalAmount = Math.round(categoryTransactions.reduce((sum, t) => sum + t.amount, 0) * 100) / 100;
            summaryItem.Transactions = categoryTransactions;
            reportAnalysis.CategorySummaries.push(summaryItem);
        }
        return reportAnalysis;
    }
    async analyseTransactions(transactions) {
        //first enhance each transaction with merchant and category info
        let enhancedTransactions = this.enhanceTransactionInfo(transactions);
        let reportAnalysis = this.createReportAnalysis(enhancedTransactions);
        await apiClient_1.apiClient.saveReportAnalysis(reportAnalysis);
        return reportAnalysis;
        //investigate the resend api
    }
}
exports.DataAnalysisService = DataAnalysisService;
//# sourceMappingURL=dataAnalysisService.js.map