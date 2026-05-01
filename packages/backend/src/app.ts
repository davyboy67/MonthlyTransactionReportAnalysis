import "dotenv/config";
import "reflect-metadata";
import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import { AppDataSource } from "./database/dataSource";
import { DashboardRepository } from "./repositories/dashboardRepository";
import { DashboardService } from "./services/DashboardService";
import { createDashboardRouter } from "./routes/dashboardRoutes";
import { BudgetRepository } from "./repositories/budgetRepository";
import { BudgetService } from "./services/BudgetService";
import { createBudgetRouter } from "./routes/budgetRoutes";
import {
  StatementExtractionService,
  TransactionInfoHandler,
  DataAnalysisService,
} from "@transaction-report/shared";

export async function createApp(): Promise<Application> {
  const app: Application = express();

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  app.use(
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", (_req: Request, res: Response) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: AppDataSource.isInitialized ? "connected" : "disconnected",
    });
  });

  const dashboardRepository = new DashboardRepository(AppDataSource);
  const statementExtractionService = new StatementExtractionService();
  const transactionInfoHandler = new TransactionInfoHandler();
  const dataAnalysisService = new DataAnalysisService(transactionInfoHandler, false);
  const dashboardService = new DashboardService(
    dashboardRepository,
    statementExtractionService,
    dataAnalysisService,
  );
  const dashboardRouter = createDashboardRouter(dashboardService);

  const budgetRepository = new BudgetRepository(AppDataSource);
  const budgetService = new BudgetService(budgetRepository);
  const budgetRouter = createBudgetRouter(budgetService);

  app.use("/api/v1", dashboardRouter);
  app.use("/api/v1", budgetRouter);
  app.use("/:stage/api/v1", dashboardRouter);
  app.use("/:stage/api/v1", budgetRouter);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({
      error: "Internal server error",
      ...(process.env.NODE_ENV === "development" && { details: err.message }),
    });
  });

  return app;
}
