import { Router, Request, Response } from 'express';
import multer from 'multer';
import { IDashboardService } from '../services/DashboardService';
import { DashboardDetailsRequest, DashboardSaveInfoRequest } from '../models/types';

const upload = multer({ storage: multer.memoryStorage() });

export function createDashboardRouter(dashboardService: IDashboardService): Router {
  const router = Router();

  // POST /api/v1/RetrieveDashboardDetails
  router.post('/RetrieveDashboardDetails', async (req: Request, res: Response) => {
    try {
      const request = req.body as DashboardDetailsRequest;
      let date: Date | undefined = undefined;
      if (request.Date) {
        date = new Date(request.Date);
      }
      const id = request.id;

      const response = await dashboardService.retrieveDashboardDetails(date, id);
      
      res.json(response);
    } catch (error) {
      console.error('Error retrieving dashboard details:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/v1/SaveReportInformation
  router.post('/SaveReportInformation', async (req: Request, res: Response) => {
    try {
      const request = req.body as DashboardSaveInfoRequest;
      
      await dashboardService.saveDashboardDetails(request.ReportAnalysis);
      
      res.status(200).send();
    } catch (error) {
      console.error('Error saving report information:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/v1/GetReportForMonth?month=X&year=Y
  router.get('/GetReportForMonth', async (req: Request, res: Response) => {
    try {
      const month = parseInt(req.query.month as string);
      const year = parseInt(req.query.year as string);
      if (!month || !year) {
        return res.status(400).json({ error: 'month and year are required' });
      }
      const response = await dashboardService.getReportForMonth(month, year);
      res.json(response);
    } catch (error) {
      console.error('Error fetching report for month:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/v1/GetTrendAnalysis?months=N
  router.get('/GetTrendAnalysis', async (req: Request, res: Response) => {
    try {
      const months = Math.min(parseInt(req.query.months as string) || 12, 12);
      const response = await dashboardService.getTrendAnalysis(months);
      res.json(response);
    } catch (error) {
      console.error('Error fetching trend analysis:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/v1/ProcessStatementFile
  router.post('/ProcessStatementFile', upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const reportAnalysis = await dashboardService.processStatementFile(req.file.buffer);
      
      res.json({ ReportAnalysis: reportAnalysis });
    } catch (error) {
      console.error('Error processing statement file:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
