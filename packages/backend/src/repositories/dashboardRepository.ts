import { Repository, DataSource } from 'typeorm';
import { ReportAnalysis as ReportAnalysisEntity } from '../entities/ReportAnalysis';
import { Transaction as TransactionEntity } from '../entities/Transaction';
import { Users } from '../entities/Users';
import {
  IReportAnalysis,
  ICategorySummary,
  ITransaction,
  TransactionType,
  ReportNotSavedError,
  CyclePayDays,
  DEFAULT_PAY_DAY,
} from '@transaction-report/shared';

function toUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toLocalDateString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function monthKey(year: number, month: number): string {
  const date = new Date(Date.UTC(year, month - 1, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

export interface IDashboardRepository {
  getReportForMonth(userId: number, month: number, year: number): Promise<IReportAnalysis | null>;
  getReportIdForMonth(userId: number, month: number, year: number): Promise<number | null>;
  getLastNMonthsReports(userId: number, n: number): Promise<IReportAnalysis[]>;
  saveDashboardDetails(userId: number, reportAnalysis: IReportAnalysis): Promise<void>;
  updateTransactionCategories(
    userId: number,
    updates: Array<{ id: number; category: string }>
  ): Promise<void>;
  resolvePayDays(userId: number, month: number, year: number): Promise<CyclePayDays>;
  savePayDays(
    userId: number,
    month: number,
    year: number,
    payDays: CyclePayDays
  ): Promise<void>;
}

export class DashboardRepository implements IDashboardRepository {
  private dataSource: DataSource;
  private reportAnalysisRepository: Repository<ReportAnalysisEntity>;
  private transactionRepository: Repository<TransactionEntity>;
  private usersRepository: Repository<Users>;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.reportAnalysisRepository = dataSource.getRepository(ReportAnalysisEntity);
    this.transactionRepository = dataSource.getRepository(TransactionEntity);
    this.usersRepository = dataSource.getRepository(Users);
  }

  async resolvePayDays(userId: number, month: number, year: number): Promise<CyclePayDays> {
    const previous = monthKey(year, month - 1);
    const target = monthKey(year, month);

    const user = await this.usersRepository.findOne({ where: { user_id: userId } });
    const fallback = user?.pay_day ?? DEFAULT_PAY_DAY;

    const rows: Array<{ pay_month: string; pay_day: number }> = await this.dataSource.query(
      `SELECT to_char(pay_month, 'YYYY-MM-DD') AS pay_month, pay_day
         FROM user_pay_day
        WHERE user_id = $1 AND pay_month = ANY($2::date[])`,
      [userId, [previous, target]]
    );

    const byMonth = new Map(rows.map(r => [r.pay_month, Number(r.pay_day)]));
    return {
      previousMonth: byMonth.get(previous) ?? fallback,
      targetMonth: byMonth.get(target) ?? fallback,
    };
  }

  async savePayDays(
    userId: number,
    month: number,
    year: number,
    payDays: CyclePayDays
  ): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO user_pay_day (user_id, pay_month, pay_day)
       VALUES ($1, $2, $3), ($1, $4, $5)
       ON CONFLICT (user_id, pay_month) DO UPDATE SET pay_day = EXCLUDED.pay_day`,
      [
        userId,
        monthKey(year, month - 1),
        payDays.previousMonth,
        monthKey(year, month),
        payDays.targetMonth,
      ]
    );
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

  async getReportIdForMonth(userId: number, month: number, year: number): Promise<number | null> {
    const entity = await this.findReportEntityForMonth(userId, month, year);
    return entity?.id ?? null;
  }

  async getLastNMonthsReports(userId: number, n: number): Promise<IReportAnalysis[]> {
    const reports = await this.reportAnalysisRepository.find({
      where: { user_id: userId },
      relations: ['transactions'],
      order: { report_date: 'DESC' },
      take: n,
    });
    return reports.reverse().map(r => this.convertReport(r));
  }

  private async findReportEntityForMonth(
    userId: number,
    month: number,
    year: number
  ): Promise<ReportAnalysisEntity | null> {
    const start = toUtcDateString(new Date(Date.UTC(year, month - 1, 1)));
    const end = toUtcDateString(new Date(Date.UTC(year, month, 0))); // last day of month

    return this.reportAnalysisRepository
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.transactions', 't')
      .where('r.user_id = :userId', { userId })
      .andWhere('r.report_date >= :start', { start })
      .andWhere('r.report_date <= :end', { end })
      .getOne();
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
      id: t.id,
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

  async saveDashboardDetails(userId: number, reportAnalysis: IReportAnalysis): Promise<void> {
    try {
      const startTime = Date.now();

      if (reportAnalysis == null) {
        throw new ReportNotSavedError(new Date());
      }

      const transactions = reportAnalysis.CategorySummaries.flatMap(cs => cs.Transactions);

      // The report's own date says which month it covers
      const reportDate = new Date(reportAnalysis.Date);
      const month = reportDate.getUTCMonth() + 1;
      const year = reportDate.getUTCFullYear();

      const existing = await this.findReportEntityForMonth(userId, month, year);
      const reportDateValue = toUtcDateString(reportDate) as unknown as Date;

      let reportId: number;
      if (existing) {
        reportId = existing.id;
        await this.transactionRepository.delete({ report_analysis_id: reportId });
        await this.reportAnalysisRepository.save({
          id: reportId,
          report_date: reportDateValue,
          total_income: reportAnalysis.TotalIncome,
          total_expenses: reportAnalysis.TotalExpenses,
          total_savings: reportAnalysis.TotalSavings,
        });
        console.log(`Report updated for ${year}-${month}`);
      } else {
        const report = await this.reportAnalysisRepository.save({
          user_id: userId,
          report_date: reportDateValue,
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
          user_id: userId,
          date: toLocalDateString(transactionDate) as unknown as Date,
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

  async updateTransactionCategories(
    userId: number,
    updates: Array<{ id: number; category: string }>
  ): Promise<void> {
    await Promise.all(
      updates.map(u =>
        this.transactionRepository.update({ id: u.id, user_id: userId }, { category: u.category })
      )
    );
  }
}
