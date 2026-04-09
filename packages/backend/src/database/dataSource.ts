import "reflect-metadata";
import { DataSource } from "typeorm";
import { ReportAnalysis } from "../entities/ReportAnalysis";
import { Transaction } from "../entities/Transaction";
import { Users } from "../entities/Users";
import { Budget } from "../entities/Budget";
import { BudgetCategory } from "../entities/BudgetCategory";
import dotenv from "dotenv";
import path from "path";

if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });
}

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: false,
  logging: false,
  entities: [Users, ReportAnalysis, Transaction, Budget, BudgetCategory],
  migrations: [],
  subscribers: [],
  ssl: process.env.DATABASE_URL?.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : false,
});
