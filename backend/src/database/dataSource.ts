import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ReportAnalysis } from '../entities/ReportAnalysis';
import { Transaction } from '../entities/Transaction';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false, // Don't auto-sync schema in production
  logging: false,
  entities: [ReportAnalysis, Transaction],
  migrations: [],
  subscribers: [],
  ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
});
