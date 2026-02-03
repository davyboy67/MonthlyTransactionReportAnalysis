import { Repository, DataSource } from 'typeorm';
import { ReportAnalysis as ReportAnalysisEntity } from '../entities/ReportAnalysis';
import { Transaction as TransactionEntity } from '../entities/Transaction';
import { ReportAnalysis, CategorySummary, Transaction } from '../models/types';

export interface IDashboardRepository {
  getDashboardDetails(date: Date, id?: number | null): Promise<ReportAnalysis | null>;
  saveDashboardDetails(reportAnalysis: ReportAnalysis): Promise<void>;
}

export class DashboardRepository implements IDashboardRepository {
  private reportAnalysisRepository: Repository<ReportAnalysisEntity>;
  private transactionRepository: Repository<TransactionEntity>;

  constructor(dataSource: DataSource) {
    this.reportAnalysisRepository = dataSource.getRepository(ReportAnalysisEntity);
    this.transactionRepository = dataSource.getRepository(TransactionEntity);
  }

  async getDashboardDetails(date?: Date, id?: number | null): Promise<ReportAnalysis | null> {
    try {
      let report;

      if (id != null) {
        report = await this.reportAnalysisRepository.findOne({
          where: { id },
          relations: ['transactions']
        });
      } 
      else if (date != null) {
        // Query by date
        const queryDate = new Date(date);
        queryDate.setHours(0, 0, 0, 0); // Normalize to start of day
        
        const reports = await this.reportAnalysisRepository.find({
          where: { 
            report_date: queryDate
          },
          relations: ['transactions'],
          order: {
            id: 'ASC'
          },
          take: 1
        });
        
        report = reports.length > 0 ? reports[0] : null;
      }
      else {
          const reports = await this.reportAnalysisRepository.find({
          relations: ['transactions'],
          order: {
            report_date: 'DESC'
          },
          take: 1
        });
        
        report = reports.length > 0 ? reports[0] : null;
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
        Month: (new Date(t.date).getMonth() + 1).toString() // Convert to Date first
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

      const reportDate = new Date(reportAnalysis.Date);
      reportDate.setHours(0, 0, 0, 0);

      const report = await this.reportAnalysisRepository.save({
        user_id: 1, // Only 1 user for now
        report_date: reportDate,
        total_income: reportAnalysis.TotalIncome,
        total_expenses: reportAnalysis.TotalExpenses
      });

      console.log('Report saved to db');

      const transactions = reportAnalysis.CategorySummaries.flatMap(cs => cs.Transactions);

      const transactionRecords = transactions.map(transaction => {
        const transactionDate = new Date(transaction.Date);
        transactionDate.setHours(0, 0, 0, 0);

        return {
          report_analysis_id: report.id,
          user_id: 1, // Only 1 user for now
          date: transactionDate,
          description: transaction.Description || '',
          amount: transaction.Amount,
          category: transaction.Category || '',
          merchant: transaction.Merchant || ''
        };
      });

      if (transactionRecords.length > 0) {
        await this.transactionRepository.save(transactionRecords);
        console.log(`All ${transactions.length} transactions saved to db`);
      }

      const elapsed = Date.now() - startTime;
      console.log(`Transactions saved to db in ${elapsed}ms`);
    } catch (error) {
      console.error('Error saving dashboard details:', error);
      throw error;
    }
  }
}
