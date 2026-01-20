import 'dotenv/config';
import 'reflect-metadata';
import express, { Application } from 'express';
import cors from 'cors';
import { AppDataSource } from './database/dataSource';
import { DashboardRepository } from './repositories/DashboardRepository';
import { DashboardService } from './services/DashboardService';
import { createDashboardRouter } from './routes/dashboardRoutes';

const app: Application = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Initialize TypeORM and start server
AppDataSource.initialize()
  .then(() => {
    console.log('TypeORM Data Source has been initialized');

    // Initialize dependencies
    const dashboardRepository = new DashboardRepository(AppDataSource);
    const dashboardService = new DashboardService(dashboardRepository);
    const dashboardRouter = createDashboardRouter(dashboardService);

    // Routes
    app.use('/api/v1', dashboardRouter);

    // Error handling middleware
    app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Unhandled error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });

    // Start server
    const server = app.listen(port, () => {
      console.log(`Backend server is running on port ${port}`);
      console.log(`Health check available at http://localhost:${port}/health`);
    });

    const shutdown = async () => {
      console.log('Shutting down gracefully...');
      await AppDataSource.destroy();
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  })
  .catch((error) => {
    console.error('Error during TypeORM Data Source initialization:', error);
    process.exit(1);
  });

export default app;
