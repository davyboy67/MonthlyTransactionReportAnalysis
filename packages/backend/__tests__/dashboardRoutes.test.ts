import request from 'supertest';
import express from 'express';
import { createDashboardRouter } from '../src/routes/dashboardRoutes';
import { IDashboardService } from '../src/services/DashboardService';
import { IReportAnalysis, UnsupportedStatementFormatError } from '@transaction-report/shared';

const USER_ID = 42;

describe('Dashboard API Routes', () => {
  let app: express.Application;
  let mockService: jest.Mocked<IDashboardService>;

  beforeEach(() => {
    mockService = {
      retrieveDashboardDetails: jest.fn(),
      getReportForMonth: jest.fn(),
      getTrendAnalysis: jest.fn(),
      saveDashboardDetails: jest.fn(),
      processStatementFile: jest.fn(),
      updateTransactionCategories: jest.fn(),
    };

    app = express();
    app.use(express.json());
    // stand in for the authenticate middleware: every request is an authed user
    app.use((req, _res, next) => {
      req.userId = USER_ID;
      next();
    });
    app.use('/api/v1', createDashboardRouter(mockService));
  });

  const sampleReport: IReportAnalysis = {
    Date: new Date('2024-01-01'),
    TotalIncome: 5000,
    TotalExpenses: 3000,
    TotalSavings: 2000,
    CategorySummaries: [],
  };

  describe('POST /RetrieveDashboardDetails', () => {
    it('should return the report and pass the authed userId to the service', async () => {
      mockService.retrieveDashboardDetails.mockResolvedValue({ ReportAnalysis: sampleReport });

      const response = await request(app)
        .post('/api/v1/RetrieveDashboardDetails')
        .send({ Date: '2024-01-01', id: null });

      expect(response.status).toBe(200);
      expect(response.body.ReportAnalysis).toBeDefined();
      expect(mockService.retrieveDashboardDetails).toHaveBeenCalledWith(
        USER_ID,
        new Date('2024-01-01'),
        null
      );
    });

    it('should handle a missing date (undefined) gracefully', async () => {
      mockService.retrieveDashboardDetails.mockResolvedValue({ ReportAnalysis: null });

      const response = await request(app).post('/api/v1/RetrieveDashboardDetails').send({});

      expect(response.status).toBe(200);
      expect(response.body.ReportAnalysis).toBeNull();
      expect(mockService.retrieveDashboardDetails).toHaveBeenCalledWith(USER_ID, undefined, undefined);
    });

    it('should return 500 on a service error', async () => {
      mockService.retrieveDashboardDetails.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/v1/RetrieveDashboardDetails')
        .send({ Date: '2024-01-01' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('POST /SaveReportInformation', () => {
    it('should save and return 200', async () => {
      mockService.saveDashboardDetails.mockResolvedValue();

      const response = await request(app)
        .post('/api/v1/SaveReportInformation')
        .send({ ReportAnalysis: sampleReport });

      expect(response.status).toBe(200);
      expect(mockService.saveDashboardDetails).toHaveBeenCalledWith(USER_ID, expect.anything());
    });

    it('should return 500 on a service error', async () => {
      mockService.saveDashboardDetails.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/v1/SaveReportInformation')
        .send({ ReportAnalysis: sampleReport });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('GET /GetReportForMonth', () => {
    it('should return the report for a valid month/year', async () => {
      mockService.getReportForMonth.mockResolvedValue({ ReportAnalysis: sampleReport });

      const response = await request(app).get('/api/v1/GetReportForMonth?month=3&year=2024');

      expect(response.status).toBe(200);
      expect(mockService.getReportForMonth).toHaveBeenCalledWith(USER_ID, 3, 2024);
    });

    it('should return 400 when month or year is missing', async () => {
      const response = await request(app).get('/api/v1/GetReportForMonth?month=3');

      expect(response.status).toBe(400);
      expect(mockService.getReportForMonth).not.toHaveBeenCalled();
    });

    it('should return 500 on a service error', async () => {
      mockService.getReportForMonth.mockRejectedValue(new Error('boom'));

      const response = await request(app).get('/api/v1/GetReportForMonth?month=3&year=2024');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /GetTrendAnalysis', () => {
    it('should default to 12 months when no param is given', async () => {
      mockService.getTrendAnalysis.mockResolvedValue({ reports: [] });

      const response = await request(app).get('/api/v1/GetTrendAnalysis');

      expect(response.status).toBe(200);
      expect(mockService.getTrendAnalysis).toHaveBeenCalledWith(USER_ID, 12);
    });

    it('should clamp the months parameter to a maximum of 12', async () => {
      mockService.getTrendAnalysis.mockResolvedValue({ reports: [] });

      await request(app).get('/api/v1/GetTrendAnalysis?months=36');

      expect(mockService.getTrendAnalysis).toHaveBeenCalledWith(USER_ID, 12);
    });

    it('should pass through a smaller months value', async () => {
      mockService.getTrendAnalysis.mockResolvedValue({ reports: [] });

      await request(app).get('/api/v1/GetTrendAnalysis?months=3');

      expect(mockService.getTrendAnalysis).toHaveBeenCalledWith(USER_ID, 3);
    });
  });

  describe('PUT /UpdateTransactionCategories', () => {
    it('should update categories scoped to the authed user', async () => {
      mockService.updateTransactionCategories.mockResolvedValue();
      const updates = [{ id: 1, category: 'Groceries' }];

      const response = await request(app)
        .put('/api/v1/UpdateTransactionCategories')
        .send({ updates });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockService.updateTransactionCategories).toHaveBeenCalledWith(USER_ID, updates);
    });

    it('should return 400 when updates is empty or not an array', async () => {
      const response = await request(app)
        .put('/api/v1/UpdateTransactionCategories')
        .send({ updates: [] });

      expect(response.status).toBe(400);
      expect(mockService.updateTransactionCategories).not.toHaveBeenCalled();
    });
  });

  describe('POST /ProcessStatementFile', () => {
    it('should process an uploaded file and return the report analysis', async () => {
      mockService.processStatementFile.mockResolvedValue(sampleReport);

      const response = await request(app)
        .post('/api/v1/ProcessStatementFile')
        .attach('file', Buffer.from('col1,col2\nval1,val2'), 'statement.csv');

      expect(response.status).toBe(200);
      expect(response.body.ReportAnalysis).toBeDefined();
      expect(mockService.processStatementFile).toHaveBeenCalledWith(USER_ID, expect.any(Buffer));
    });

    it('should return 400 when no file is uploaded', async () => {
      const response = await request(app).post('/api/v1/ProcessStatementFile').send();

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No file uploaded');
    });

    it('should return 500 when processing fails', async () => {
      mockService.processStatementFile.mockRejectedValue(new Error('Parse error'));

      const response = await request(app)
        .post('/api/v1/ProcessStatementFile')
        .attach('file', Buffer.from('bad,data'), 'statement.csv');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });

    it('should return 400 when the statement format is not recognised', async () => {
      mockService.processStatementFile.mockRejectedValue(
        new UnsupportedStatementFormatError('statement did not match any supported bank (FNB)')
      );

      const response = await request(app)
        .post('/api/v1/ProcessStatementFile')
        .attach('file', Buffer.from('bad,data'), 'statement.csv');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Unsupported statement format');
    });
  });
});
