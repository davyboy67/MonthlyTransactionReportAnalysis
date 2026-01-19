import { IDashboardRepository } from '../repositories/DashboardRepository';
import { ReportAnalysis, DashboardDetailsResponse } from '../models/types';

export interface IDashboardService {
  retrieveDashboardDetails(date: Date, id?: number | null): Promise<DashboardDetailsResponse>;
  saveDashboardDetails(reportAnalysis: ReportAnalysis): Promise<void>;
}

export class DashboardService implements IDashboardService {
  private dashboardRepository: IDashboardRepository;

  constructor(dashboardRepository: IDashboardRepository) {
    this.dashboardRepository = dashboardRepository;
  }

  async retrieveDashboardDetails(date: Date, id?: number | null): Promise<DashboardDetailsResponse> {
    const reportAnalysis = await this.dashboardRepository.getDashboardDetails(date, id);
    
    return {
      ReportAnalysis: reportAnalysis
    };
  }

  async saveDashboardDetails(reportAnalysis: ReportAnalysis): Promise<void> {
    await this.dashboardRepository.saveDashboardDetails(reportAnalysis);
  }
}
