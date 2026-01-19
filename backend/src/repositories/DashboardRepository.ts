import { PrismaClient } from '@prisma/client';
import { ReportAnalysis, CategorySummary, Transaction } from '../models/types';

export interface IDashboardRepository {
  getDashboardDetails(date: Date, id?: number | null): Promise<ReportAnalysis | null>;
  saveDashboardDetails(reportAnalysis: ReportAnalysis): Promise<void>;
}

export class DashboardRepository implements IDashboardRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async getDashboardDetails(date: Date, id?: number | null): Promise<ReportAnalysis | null> {
    try {
      let report;

      if (id != null) {
        report = await this.prisma.reportAnalysis.findUnique({
          where: { id },
          include: { transactions: true }
        });
      } else {
        // Query by date
        const queryDate = new Date(date);
        queryDate.setHours(0, 0, 0, 0); // Normalize to start of day
        
        report = await this.prisma.reportAnalysis.findFirst({
          where: { 
            report_date: queryDate
          },
          include: { transactions: true }
        });
      }

      if (!report) {
        return null;
      }

      // Convert transactions to the expected format
      const transactionList: Transaction[] = report.transactions.map(t => ({
        Date: t.date,
        Description: t.description,
        Amount: Number(t.amount),
        Category: t.category,
        Merchant: t.merchant,
        Month: (t.date.getMonth() + 1).toString() // JavaScript getMonth() returns 0-11, but we need 1-12
      }));

      // Compile category summaries
      const categorySummaries = this.compileCategorySummary(transactionList);

      const reportAnalysis: ReportAnalysis = {
        Date: report.report_date,
        TotalIncome: Number(report.total_income),
        TotalExpenses: Number(report.total_expenses),
        CategorySummaries: categorySummaries
      };

      return reportAnalysis;
    } catch (error) {
      console.error('Error getting dashboard details:', error);
      throw error;
    }
  }

  private compileCategorySummary(transactionList: Transaction[]): CategorySummary[] {
    const categorySummaries: CategorySummary[] = [];
    const uniqueCategories = [...new Set(transactionList.map(t => t.Category).filter(c => c))];

    for (const category of uniqueCategories) {
      const categoryTransactions = transactionList.filter(t => t.Category === category);
      
      const merchants = [...new Set(categoryTransactions.map(t => t.Merchant).filter(m => m))];
      const totalAmount = categoryTransactions.reduce((sum, t) => sum + t.Amount, 0);

      const summary: CategorySummary = {
        CategoryName: category || '',
        Merchants: merchants as string[],
        TotalAmount: totalAmount,
        Transactions: categoryTransactions
      };

      categorySummaries.push(summary);
    }

    return categorySummaries;
  }

  async saveDashboardDetails(reportAnalysis: ReportAnalysis): Promise<void> {
    try {
      const startTime = Date.now();

      // Parse the date to ensure it's a Date object
      const reportDate = new Date(reportAnalysis.Date);
      reportDate.setHours(0, 0, 0, 0); // Normalize to start of day

      // Insert the report analysis
      const report = await this.prisma.reportAnalysis.create({
        data: {
          report_date: reportDate,
          total_income: reportAnalysis.TotalIncome,
          total_expenses: reportAnalysis.TotalExpenses
        }
      });

      console.log('Report saved to db');

      // Get all transactions from category summaries
      const transactions = reportAnalysis.CategorySummaries.flatMap(cs => cs.Transactions);

      // Insert all transactions
      for (const transaction of transactions) {
        const transactionDate = new Date(transaction.Date);
        transactionDate.setHours(0, 0, 0, 0);

        await this.prisma.transaction.create({
          data: {
            report_analysis_id: report.id,
            date: transactionDate,
            description: transaction.Description || '',
            amount: transaction.Amount,
            category: transaction.Category || '',
            merchant: transaction.Merchant || ''
          }
        });
      }

      const elapsed = Date.now() - startTime;
      console.log(`Transactions saved to db in ${elapsed}ms`);
    } catch (error) {
      console.error('Error saving dashboard details:', error);
      throw error;
    }
  }
}
