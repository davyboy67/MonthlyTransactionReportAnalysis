import { Router, Request, Response } from 'express';
import { IDashboardService } from '../services/DashboardService';
import { DashboardDetailsRequest, DashboardSaveInfoRequest } from '../models/types';

export function createDashboardRouter(dashboardService: IDashboardService): Router {
  const router = Router();

  // POST /api/v1/RetrieveDashboardDetails
  router.post('/RetrieveDashboardDetails', async (req: Request, res: Response) => {
    try {
      const request = req.body as DashboardDetailsRequest;
      const date = new Date(request.Date);
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

  return router;
}
