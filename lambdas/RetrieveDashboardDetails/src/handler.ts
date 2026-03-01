import "reflect-metadata";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DashboardRepository } from "../../../packages/backend/src/repositories/DashboardRepository";
import { AppDataSource } from "../../../packages/backend/src/database/dataSource";
import { DataAnalysisService, StatementExtractionService, TransactionInfoHandler } from "@transaction-report/shared";
import { DashboardService } from "../../../packages/backend/src/services/DashboardService";

let isInitialized = false;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};

export const handler = async (event: APIGatewayProxyEvent) : Promise<APIGatewayProxyResult> => {
    try {
        if (!isInitialized) {
            await AppDataSource.initialize();
            isInitialized = true;
        }

        const body = JSON.parse(event.body || '{}');
        const date = body.Date ? new Date(body.Date) : undefined;
        const id = body.id || null;

        const dashboardRepository = new DashboardRepository(AppDataSource);
        const transactionInfoHandler = new TransactionInfoHandler()
        const dataAnalysisService = new DataAnalysisService(transactionInfoHandler, false);
        const statementExtractionService = new StatementExtractionService();

        const dashboardService = new DashboardService(dashboardRepository, statementExtractionService, dataAnalysisService);

        const response = await dashboardService.retrieveDashboardDetails(date, id);

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                ...corsHeaders
            },
            body: JSON.stringify(response)
        };
    } catch (error) {
        console.error('Error retrieving dashboard details:', error);
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                ...corsHeaders
            },
            body: JSON.stringify({ 
                error: "Internal Server Error",
                message: error instanceof Error ? error.message : 'Unknown error'
            })
        }
    }
}