import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ReportAnalysis } from '../entities/ReportAnalysis';
import { Transaction } from '../entities/Transaction';
import { User } from '../entities/User';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  logging: false,
  entities: [User, ReportAnalysis, Transaction],
  migrations: [],
  subscribers: [],
  ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
});
