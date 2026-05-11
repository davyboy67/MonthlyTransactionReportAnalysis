import { AppDataSource } from '../database/dataSource';
import { Users } from '../entities/Users';
import type { IDashboardRepository } from '../repositories/dashboardRepository';
import type { IBudgetRepository } from '../repositories/budgetRepository';
import { buildReportPdf } from './PdfReportBuilder';
import { sendReportEmail } from './EmailService';

export class ReportEmailService {
  constructor(
    private dashboardRepo: IDashboardRepository,
    private budgetRepo: IBudgetRepository
  ) {}

  async sendMonthlyReport(userId: number, month: number, year: number): Promise<void> {
    const user = await AppDataSource.getRepository(Users).findOne({ where: { user_id: userId } });
    if (!user) throw new Error(`User ${userId} not found`);

    const report = await this.dashboardRepo.getReportForMonth(userId, month, year);
    if (!report) throw new Error(`No report found for ${year}-${month}`);

    const budget = await this.budgetRepo.findByUserAndMonth(userId, month, year);
    const pdfBuffer = await buildReportPdf(report, budget, user.first_name, month, year);

    await sendReportEmail(user.email, user.first_name, month, year, pdfBuffer);
  }
}
