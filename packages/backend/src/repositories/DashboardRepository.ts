import { Repository, DataSource } from 'typeorm';
import { ReportAnalysis as ReportAnalysisEntity } from '../entities/ReportAnalysis';
import { Transaction as TransactionEntity } from '../entities/Transaction';
import {
  IReportAnalysis,
  ICategorySummary,
  ITransaction,
  TransactionType,
  ReportNotFoundError,
  ReportNotSavedError,
} from '@transaction-report/shared';

export interface IDashboardRepository {
  getDashboardDetails(date?: Date, id?: number | null): Promise<IReportAnalysis | null>;
  getReportForMonth(userId: number, month: number, year: number): Promise<IReportAnalysis | null>;
  saveDashboardDetails(reportAnalysis: IReportAnalysis): Promise<void>;
}

export class DashboardRepository implements IDashboardRepository {
  private reportAnalysisRepository: Repository<ReportAnalysisEntity>;
  private transactionRepository: Repository<TransactionEntity>;

  constructor(dataSource: DataSource) {
    this.reportAnalysisRepository = dataSource.getRepository(ReportAnalysisEntity);
    this.transactionRepository = dataSource.getRepository(TransactionEntity);
  }

  async getDashboardDetails(date?: Date, id?: number | null): Promise<IReportAnalysis | null> {
    try {
      let report;

      if (id != null) {
        report = await this.reportAnalysisRepository.findOne({
          where: { id },
          relations: ['transactions'],
        });
      } else if (date != null) {
        const queryDate = new Date(date);
        queryDate.setHours(0, 0, 0, 0);

        const reports = await this.reportAnalysisRepository.find({
          where: {
            report_date: queryDate,
          },
          relations: ['transactions'],
          order: {
            id: 'ASC',
          },
          take: 1,
        });

        report = reports.length > 0 ? reports[0] : null;
      } else {
        const reports = await this.reportAnalysisRepository.find({
          relations: ['transactions'],
          order: {
            report_date: 'DESC',
          },
          take: 1,
        });

        report = reports.length > 0 ? reports[0] : null;
      }

      if (!report) {
        throw new ReportNotFoundError(date || new Date());
      }

      console.log(`Retrieved report from db for date: ${report.report_date}`);
      return this.convertReport(report);
    } catch (error) {
      console.error('Error getting dashboard details:', error);
      throw error;
    }
  }

  async getReportForMonth(
    userId: number,
    month: number,
    year: number
  ): Promise<IReportAnalysis | null> {
    const entity = await this.findReportEntityForMonth(userId, month, year);
    if (!entity) return null;
    return this.convertReport(entity);
  }

  private async findReportEntityForMonth(
    userId: number,
    month: number,
    year: number
  ): Promise<ReportAnalysisEntity | null> {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0)); // last day of month

    return this.reportAnalysisRepository
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.transactions', 't')
      .where('r.user_id = :userId', { userId })
      .andWhere('r.report_date >= :start', { start })
      .andWhere('r.report_date <= :end', { end })
      .getOne();
  }

  private dominantMonth(transactions: ITransaction[]): { month: number; year: number } {
    const counts = new Map<string, { month: number; year: number; count: number }>();
    for (const t of transactions) {
      const d = new Date(t.Date);
      const m = d.getUTCMonth() + 1;
      const y = d.getUTCFullYear();
      const key = `${y}-${m}`;
      const entry = counts.get(key) ?? { month: m, year: y, count: 0 };
      counts.set(key, { ...entry, count: entry.count + 1 });
    }
    return [...counts.values()].reduce((a, b) => (b.count > a.count ? b : a));
  }

  private compileCategorySummary(transactionList: ITransaction[]): ICategorySummary[] {
    const categorySummaries: ICategorySummary[] = [];
    const uniqueCategories = [...new Set(transactionList.map(t => t.Category).filter(c => c))];

    for (const category of uniqueCategories) {
      const categoryTransactions = transactionList.filter(t => t.Category === category);

      const merchants = [...new Set(categoryTransactions.map(t => t.Merchant).filter(m => m))];
      const totalAmount = categoryTransactions.reduce((sum, t) => sum + t.Amount, 0);

      categorySummaries.push({
        CategoryName: category || '',
        Merchants: merchants as string[],
        TotalAmount: totalAmount,
        Transactions: categoryTransactions,
      });
    }

    return categorySummaries;
  }

  private convertReport(report: ReportAnalysisEntity): IReportAnalysis {
    const transactionList: ITransaction[] = report.transactions.map(t => ({
      Date: t.date,
      Description: t.description,
      Amount: Number(t.amount),
      Category: t.category,
      Merchant: t.merchant,
      Month: (new Date(t.date).getMonth() + 1).toString(),
      Type: TransactionType[t.type as keyof typeof TransactionType],
    }));

    return {
      Date: report.report_date,
      TotalIncome: Number(report.total_income),
      TotalExpenses: Number(report.total_expenses),
      TotalSavings: Number(report.total_savings),
      CategorySummaries: this.compileCategorySummary(transactionList),
    };
  }

  async saveDashboardDetails(reportAnalysis: IReportAnalysis): Promise<void> {
    try {
      const startTime = Date.now();

      if (reportAnalysis == null) {
        throw new ReportNotSavedError(new Date());
      }

      const transactions = reportAnalysis.CategorySummaries.flatMap(cs => cs.Transactions);

      const { month, year } = this.dominantMonth(transactions);

      const now = new Date();
      const isCurrentMonth = month === now.getUTCMonth() + 1 && year === now.getUTCFullYear();
      const reportDate = isCurrentMonth
        ? new Date(reportAnalysis.Date)
        : new Date(Date.UTC(year, month, 0)); // last day of month

      const existing = await this.findReportEntityForMonth(1, month, year);

      let reportId: number;
      if (existing) {
        reportId = existing.id;
        await this.transactionRepository.delete({ report_analysis_id: reportId });
        await this.reportAnalysisRepository.save({
          id: reportId,
          report_date: reportDate,
          total_income: reportAnalysis.TotalIncome,
          total_expenses: reportAnalysis.TotalExpenses,
          total_savings: reportAnalysis.TotalSavings,
        });
        console.log(`Report updated for ${year}-${month}`);
      } else {
        const report = await this.reportAnalysisRepository.save({
          user_id: 1,
          report_date: reportDate,
          total_income: reportAnalysis.TotalIncome,
          total_expenses: reportAnalysis.TotalExpenses,
          total_savings: reportAnalysis.TotalSavings,
        });
        reportId = report.id;
        console.log(`Report created for ${year}-${month}`);
      }

      const transactionRecords = transactions.map(transaction => {
        const transactionDate = new Date(transaction.Date);
        transactionDate.setHours(0, 0, 0, 0);
        return {
          report_analysis_id: reportId,
          user_id: 1,
          date: transactionDate,
          description: transaction.Description || '',
          amount: transaction.Amount,
          category: transaction.Category || '',
          merchant: transaction.Merchant || '',
          type: transaction.Type || '',
        };
      });

      if (transactionRecords.length > 0) {
        await this.transactionRepository.save(transactionRecords);
        console.log(`${transactions.length} transactions saved`);
      }

      console.log(`saveDashboardDetails completed in ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error('Error saving dashboard details:', error);
      throw error;
    }
  }
}
