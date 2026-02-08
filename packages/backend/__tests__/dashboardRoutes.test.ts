import request from 'supertest';
import express from 'express';
import { createDashboardRouter } from '../src/routes/dashboardRoutes';
import { IDashboardService } from '../src/services/DashboardService';
import { IReportAnalysis } from '@transaction-report/shared';

describe('Dashboard API Routes', () => {
  let app: express.Application;
  let mockService: jest.Mocked<IDashboardService>;

  beforeEach(() => {
    mockService = {
      retrieveDashboardDetails: jest.fn(),
      saveDashboardDetails: jest.fn(),
      processStatementFile: jest.fn()
    };

    app = express();
    app.use(express.json());
    app.use('/api/v1', createDashboardRouter(mockService));
  });

  describe('POST /api/v1/RetrieveDashboardDetails', () => {
    it('should retrieve dashboard details', async () => {
      const mockReport: IReportAnalysis = {
        Date: new Date('2024-01-01'),
        TotalIncome: 5000,
        TotalExpenses: 3000,
        CategorySummaries: []
      };

      mockService.retrieveDashboardDetails.mockResolvedValue({
        ReportAnalysis: mockReport
      });

      const response = await request(app)
        .post('/api/v1/RetrieveDashboardDetails')
        .send({
          Date: '2024-01-01',
          id: null
        });

      expect(response.status).toBe(200);
      expect(response.body.ReportAnalysis).toBeDefined();
      expect(mockService.retrieveDashboardDetails).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      mockService.retrieveDashboardDetails.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/v1/RetrieveDashboardDetails')
        .send({
          Date: '2024-01-01',
          id: null
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('POST /api/v1/SaveReportInformation', () => {
    it('should save report information', async () => {
      const mockReport: IReportAnalysis = {
        Date: new Date('2024-01-01'),
        TotalIncome: 5000,
        TotalExpenses: 3000,
        CategorySummaries: []
      };

      mockService.saveDashboardDetails.mockResolvedValue();

      const response = await request(app)
        .post('/api/v1/SaveReportInformation')
        .send({
          ReportAnalysis: mockReport
        });

      expect(response.status).toBe(200);
      expect(mockService.saveDashboardDetails).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      mockService.saveDashboardDetails.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/v1/SaveReportInformation')
        .send({
          ReportAnalysis: {
            Date: '2024-01-01',
            TotalIncome: 5000,
            TotalExpenses: 3000,
            CategorySummaries: []
          }
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });
});
