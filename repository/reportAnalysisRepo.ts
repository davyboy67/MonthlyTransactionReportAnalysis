import { IReportAnalysis } from "../models/IReportAnalysis";
import { ITransaction } from "../models/ITransaction";
import { IReportAnalysisRepo } from "./IReportAnalysisRepo";
import { DbReportAnalysis } from "./DTO/dbReportAnalysis";
import { Client } from "pg";
import * as dotenv from "dotenv";

export class ReportAnalysisRepo implements IReportAnalysisRepo {
  private dbConnectionString: string;
  private client?: Client;

  constructor() {
    dotenv.config();
    this.dbConnectionString = process.env.DB_CONN_STRING ? process.env.DB_CONN_STRING : "";
  }

  private async openConnection() {
    try {
      if (!this.client) {
        this.client = new Client({
          connectionString: this.dbConnectionString,
          ssl: true,
          connectionTimeoutMillis: 30000,
        });
        await this.client.connect();
      }
    } catch (error) {
      console.error("Error connecting to the database:", error);
      throw error;
    }
  }

  private async closeConnection() {
    if (this.client) {
      await this.client.end();
    }
  }

    async getReportAnalysis(reportDate: Date): Promise<DbReportAnalysis> {
    try {
      const result = await this.client?.query(
        "SELECT * FROM reportanalysis WHERE report_date = $1",
        [reportDate]
      );

      if (result && result.rows.length > 0) {
        const row = result.rows[0];
        const reportAnalysis: DbReportAnalysis = {
          id: row.id,
          report_date: row.report_date,
          totalIncome: row.total_income,
          totalExpenses: row.total_expenses,
        };
        return reportAnalysis;
      }

      throw new Error(`Report generated on date ${reportDate} not found`);
    } catch (error) {
      console.log("Failed to fetch data from db:", error);
      throw error;
    }
  }

  async saveReportAnalysis(reportAnalysis: IReportAnalysis): Promise<void> {
    try {
      await this.openConnection();
      await this.client?.query(
        "INSERT INTO reportanalysis (report_date, total_income, total_expenses) VALUES ($1, $2, $3)",
        [
          reportAnalysis.date,
          reportAnalysis.totalIncome,
          reportAnalysis.totalExpenses
        ]
      );
      let transactions = reportAnalysis.categorySummary.map(item => item.transactions).flat();
      await this.saveTransactions(transactions, reportAnalysis.date);
    } catch (error) {
      console.error("Error saving report analysis:", error);
      throw error;
    } finally {
      await this.closeConnection();
    }
  }

  private async saveTransactions(transactions: ITransaction[], reportDate: Date): Promise<void> {
    const reportAnalysis = await this.getReportAnalysis(reportDate);
    const reportAnalysisId = reportAnalysis.id;

    if (!reportAnalysisId) {
        throw new Error(`Report analysis for date ${reportDate} not found.`);
    }


    for (const transaction of transactions) {
        await this.client?.query(
          "INSERT INTO transaction (report_analysis_id, date, description, amount, category, merchant) VALUES ($1, $2, $3, $4, $5, $6)",
          [
            reportAnalysisId,
            transaction.date,
            transaction.description,
            transaction.amount,
            transaction.category,
            transaction.merchant
          ]
        );
    }
  }
}
