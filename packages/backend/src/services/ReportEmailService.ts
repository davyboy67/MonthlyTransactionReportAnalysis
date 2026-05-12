import { AppDataSource } from '../database/dataSource';
import { Users } from '../entities/Users';
import { ReportLog } from '../entities/ReportLog';
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

    const [report, reportAnalysisId] = await Promise.all([
      this.dashboardRepo.getReportForMonth(userId, month, year),
      this.dashboardRepo.getReportIdForMonth(userId, month, year),
    ]);
    if (!report) throw new Error(`No report found for ${year}-${month}`);

    const budget = await this.budgetRepo.findByUserAndMonth(userId, month, year);
    const pdfBuffer = await buildReportPdf(report, budget, user.first_name, month, year);

    let emailSent = false;
    let emailSentAt: Date | null = null;
    let sendError: unknown = null;

    try {
      await sendReportEmail(user.email, user.first_name, month, year, pdfBuffer);
      emailSent = true;
      emailSentAt = new Date();
    } catch (err) {
      sendError = err;
      console.error('[ReportEmailService] sendReportEmail failed:', err);
    }

    try {
      await AppDataSource.getRepository(ReportLog).save({
        report_analysis_id: reportAnalysisId,
        email_sent: emailSent,
        email_sent_at: emailSentAt,
        pdf_data: pdfBuffer,
      });
    } catch (logErr) {
      console.error('[ReportEmailService] Failed to insert report_log row:', logErr);
    }

    if (sendError) throw sendError;
  }
}
