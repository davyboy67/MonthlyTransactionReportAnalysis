import 'dotenv/config';
import 'reflect-metadata';
import { createApp } from './app';
import { AppDataSource } from './database/dataSource';

const port = process.env.PORT || 3001;

createApp()
  .then((app) => {
    const server = app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
      console.log(`Health check: http://localhost:${port}/health`);
    });

    const shutdown = async () => {
      server.close(async () => {
        if (AppDataSource.isInitialized) {
          await AppDataSource.destroy();
        }
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
