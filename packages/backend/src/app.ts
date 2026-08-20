import 'dotenv/config';
import 'reflect-metadata';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { AppDataSource } from './database/dataSource';
import { DashboardRepository } from './repositories/dashboardRepository';
import { ReferenceDataRepository } from './repositories/referenceDataRepository';
import { DashboardService } from './services/DashboardService';
import { createDashboardRouter } from './routes/dashboardRoutes';
import { BudgetRepository } from './repositories/budgetRepository';
import { BudgetService } from './services/BudgetService';
import { createBudgetRouter } from './routes/budgetRoutes';
import { ReportEmailService } from './services/ReportEmailService';
import { createEmailRouter } from './routes/emailRoutes';
import { AuthService } from './services/AuthService';
import { createAuthRouter } from './routes/authRoutes';
import { UserInviteRepository } from './repositories/userInviteRepository';
import { InviteService } from './services/InviteService';
import { createInviteRouter } from './routes/inviteRoutes';
import { authenticate } from './middleware/authenticate';
import {
  StatementExtractionService,
  TransactionInfoHandler,
  DataAnalysisService,
} from '@transaction-report/shared';

export async function createApp(): Promise<Application> {
  const app: Application = express();

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: AppDataSource.isInitialized ? 'connected' : 'disconnected',
    });
  });

  const dashboardRepository = new DashboardRepository(AppDataSource);
  const referenceDataRepository = new ReferenceDataRepository(AppDataSource);
  const statementExtractionService = new StatementExtractionService();
  const transactionInfoHandler = new TransactionInfoHandler(
    await referenceDataRepository.getMerchantRules()
  );
  const dataAnalysisService = new DataAnalysisService(transactionInfoHandler, false);
  const dashboardService = new DashboardService(
    dashboardRepository,
    statementExtractionService,
    dataAnalysisService,
    referenceDataRepository
  );
  const dashboardRouter = createDashboardRouter(dashboardService);

  const budgetRepository = new BudgetRepository(AppDataSource);
  const budgetService = new BudgetService(budgetRepository, referenceDataRepository);
  const budgetRouter = createBudgetRouter(budgetService);

  const reportEmailService = new ReportEmailService(dashboardRepository, budgetRepository);
  const emailRouter = createEmailRouter(reportEmailService);

  const authService = new AuthService(AppDataSource);
  const authRouter = createAuthRouter(authService);

  const userInviteRepository = new UserInviteRepository(AppDataSource);
  const inviteService = new InviteService(userInviteRepository);
  const inviteRouter = createInviteRouter(inviteService);

  app.use('/api/v1', authRouter);
  app.use('/api/v1', emailRouter);
  app.use('/api/v1', inviteRouter);
  app.use('/:stage/api/v1', authRouter);
  app.use('/:stage/api/v1', emailRouter);
  app.use('/:stage/api/v1', inviteRouter);

  app.use('/api/v1', authenticate, dashboardRouter);
  app.use('/api/v1', authenticate, budgetRouter);
  app.use('/:stage/api/v1', authenticate, dashboardRouter);
  app.use('/:stage/api/v1', authenticate, budgetRouter);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      error: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { details: err.message }),
    });
  });

  return app;
}
