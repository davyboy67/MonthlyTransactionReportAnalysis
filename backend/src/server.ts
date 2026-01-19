import 'dotenv/config';
import express, { Application } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { DashboardRepository } from './repositories/DashboardRepository';
import { DashboardService } from './services/DashboardService';
import { createDashboardRouter } from './routes/dashboardRoutes';

const app: Application = express();
const port = process.env.PORT || 3001;

// Initialize Prisma Client
const prisma = new PrismaClient();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Initialize dependencies
const dashboardRepository = new DashboardRepository(prisma);
const dashboardService = new DashboardService(dashboardRepository);
const dashboardRouter = createDashboardRouter(dashboardService);

// Routes
app.use('/api/v1', dashboardRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

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

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
