import "reflect-metadata";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DashboardRepository } from "../../../packages/backend/src/repositories/DashboardRepository";
import { AppDataSource } from "../../../packages/backend/src/database/dataSource";
import { DataAnalysisService, StatementExtractionService, TransactionInfoHandler } from "@transaction-report/shared";
import { DashboardService } from "../../../packages/backend/src/services/DashboardService";

let isInitialized = false;

export const handler = async (event: APIGatewayProxyEvent) : Promise<APIGatewayProxyResult> => {
    try {
        if (!isInitialized) {
            await AppDataSource.initialize();
            isInitialized = true;
        }

        const body = JSON.parse(event.body || '{}');
        const date = body.date ? new Date(body.date) : new Date();
        const id = body.id || null;

        const dashboardRepository = new DashboardRepository(AppDataSource);
        const transactionInfoHandler = new TransactionInfoHandler()
        const dataAnalysisService = new DataAnalysisService(transactionInfoHandler);
        const statementExtractionService = new StatementExtractionService();

        const dashboardService = new DashboardService(dashboardRepository, statementExtractionService, dataAnalysisService);

        const reportAnalysis = await dashboardService.retrieveDashboardDetails(date, id);

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({ reportAnalysis: reportAnalysis })
        };
    } catch (error) {
        console.error('Error retrieving dashboard details:', error);
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({ 
                error: "Internal Server Error",
                message: error instanceof Error ? error.message : 'Unknown error'
            })
        }
    }
}