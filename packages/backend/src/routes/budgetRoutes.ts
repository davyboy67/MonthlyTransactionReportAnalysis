import { Router, Request, Response } from 'express';
import { IBudgetService } from '../services/BudgetService';

export function createBudgetRouter(budgetService: IBudgetService): Router {
  const router = Router();

  // GET /api/v1/GetBudgetForMonth?month=5&year=2026
  router.get('/GetBudgetForMonth', async (req: Request, res: Response) => {
    try {
      const month = parseInt(req.query.month as string);
      const year = parseInt(req.query.year as string);

      if (!month || !year || month < 1 || month > 12) {
        return res.status(400).json({ error: 'Valid month (1-12) and year are required' });
      }

      const response = await budgetService.getBudgetForMonth(req.userId, month, year);
      res.json(response);
    } catch (error) {
      console.error('Error fetching budget:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/v1/SaveBudget
  router.post('/SaveBudget', async (req: Request, res: Response) => {
    try {
      const { budget } = req.body;

      if (!budget) {
        return res.status(400).json({ error: 'budget is required' });
      }

      budget.user_id = req.userId;

      await budgetService.saveOrUpdateBudget(budget);
      res.status(200).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal server error';
      const status = message === 'Cannot modify budget after month has ended' ? 400 : 500;
      console.error('Error saving budget:', error);
      res.status(status).json({ error: message });
    }
  });

  // GET /api/v1/GetLatestBudget
  router.get('/GetLatestBudget', async (req: Request, res: Response) => {
    try {
      const budget = await budgetService.getMostRecentBudget(req.userId);
      res.json({ budget });
    } catch (error) {
      console.error('Error fetching latest budget:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
