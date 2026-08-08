import request from 'supertest';
import express from 'express';
import { createDashboardRouter } from '../src/routes/dashboardRoutes';
import { IDashboardService } from '../src/services/DashboardService';
import { IReportAnalysis, NoTransactionsInPeriodError } from '@transaction-report/shared';

const USER_ID = 42;

describe('Dashboard API Routes', () => {
  let app: express.Application;
  let mockService: jest.Mocked<IDashboardService>;

  beforeEach(() => {
    mockService = {
      getReportForMonth: jest.fn(),
      getTrendAnalysis: jest.fn(),
      saveDashboardDetails: jest.fn(),
      processStatementFile: jest.fn(),
      updateTransactionCategories: jest.fn(),
      getPayDays: jest.fn(),
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

  describe('GET /GetPayDays', () => {
    it('should return the resolved pay days for the requested month', async () => {
      mockService.getPayDays.mockResolvedValue({ previousMonth: 13, targetMonth: 26 });

      const response = await request(app).get('/api/v1/GetPayDays?month=1&year=2026');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ previousMonth: 13, targetMonth: 26 });
      expect(mockService.getPayDays).toHaveBeenCalledWith(USER_ID, 1, 2026);
    });

    it('should return 400 when the month is out of range', async () => {
      const response = await request(app).get('/api/v1/GetPayDays?month=13&year=2026');

      expect(response.status).toBe(400);
      expect(mockService.getPayDays).not.toHaveBeenCalled();
    });
  });

  describe('POST /ProcessStatementFile', () => {
    it('should process an uploaded file and return the report analysis', async () => {
      mockService.processStatementFile.mockResolvedValue(sampleReport);

      const response = await request(app)
        .post('/api/v1/ProcessStatementFile')
        .field('month', '3')
        .field('year', '2024')
        .field('payDayPrevious', '26')
        .field('payDayTarget', '26')
        .attach('file', Buffer.from('col1,col2\nval1,val2'), 'statement.csv');

      expect(response.status).toBe(200);
      expect(response.body.ReportAnalysis).toBeDefined();
      // the viewed month and its pay days are passed through so only that cycle is reported on
      expect(mockService.processStatementFile).toHaveBeenCalledWith(
        USER_ID,
        3,
        2024,
        expect.any(Buffer),
        { previousMonth: 26, targetMonth: 26 }
      );
    });

    it('should return 400 when a pay day is out of range', async () => {
      const response = await request(app)
        .post('/api/v1/ProcessStatementFile')
        .field('month', '3')
        .field('year', '2024')
        .field('payDayPrevious', '32')
        .field('payDayTarget', '26')
        .attach('file', Buffer.from('col1,col2'), 'statement.csv');

      expect(response.status).toBe(400);
      expect(mockService.processStatementFile).not.toHaveBeenCalled();
    });

    it('should return 400 with the period message when the file covers the wrong months', async () => {
      mockService.processStatementFile.mockRejectedValue(
        new NoTransactionsInPeriodError(
          new Date(2024, 1, 26),
          new Date(2024, 2, 25),
          new Date(2024, 0, 1),
          new Date(2024, 0, 31)
        )
      );

      const response = await request(app)
        .post('/api/v1/ProcessStatementFile')
        .field('month', '3')
        .field('year', '2024')
        .field('payDayPrevious', '26')
        .field('payDayTarget', '26')
        .attach('file', Buffer.from('col1,col2'), 'statement.csv');

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/No transactions between/);
    });

    it('should return 400 when no file is uploaded', async () => {
      const response = await request(app).post('/api/v1/ProcessStatementFile').send();

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No file uploaded');
    });

    it('should return 400 when the month is missing or out of range', async () => {
      const response = await request(app)
        .post('/api/v1/ProcessStatementFile')
        .field('month', '13')
        .field('year', '2024')
        .field('payDayPrevious', '26')
        .field('payDayTarget', '26')
        .attach('file', Buffer.from('col1,col2'), 'statement.csv');

      expect(response.status).toBe(400);
      expect(mockService.processStatementFile).not.toHaveBeenCalled();
    });

    it('should return 500 when processing fails', async () => {
      mockService.processStatementFile.mockRejectedValue(new Error('Parse error'));

      const response = await request(app)
        .post('/api/v1/ProcessStatementFile')
        .field('month', '3')
        .field('year', '2024')
        .field('payDayPrevious', '26')
        .field('payDayTarget', '26')
        .attach('file', Buffer.from('bad,data'), 'statement.csv');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });
});
