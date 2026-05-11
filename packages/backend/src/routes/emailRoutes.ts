import { Router, Request, Response } from 'express';
import { ReportEmailService } from '../services/ReportEmailService';

export function createEmailRouter(reportEmailService: ReportEmailService): Router {
  const router = Router();

  router.post('/TriggerMonthlyReport', async (req: Request, res: Response) => {
    try {
      const { month, year } = req.body as { month: number; year: number };
      if (!month || !year || month < 1 || month > 12) {
        return res.status(400).json({ error: 'Valid month (1-12) and year required' });
      }
      await reportEmailService.sendMonthlyReport(1, Number(month), Number(year));
      res.json({ message: `Report sent for ${year}-${String(month).padStart(2, '0')}` });
    } catch (err) {
      console.error('Report trigger failed:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
