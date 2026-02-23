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
        const fileContent = body.fileContent;

        if (!fileContent) {
            return {
                statusCode: 400,
                headers: {
                    "Content-Type": "application/json",
                    ...corsHeaders
                },
                body: JSON.stringify({ error: "File content is required" })
            };
        }

        // Convert base64 encoded file content to Buffer
        const fileBuffer = Buffer.from(fileContent, 'base64');

        const dashboardRepository = new DashboardRepository(AppDataSource);
        const transactionInfoHandler = new TransactionInfoHandler()
        const dataAnalysisService = new DataAnalysisService(transactionInfoHandler);
        const statementExtractionService = new StatementExtractionService();

        const dashboardService = new DashboardService(dashboardRepository, statementExtractionService, dataAnalysisService);

        const reportAnalysis = await dashboardService.processStatementFile(fileBuffer);

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                ...corsHeaders
            },
            body: JSON.stringify({ reportAnalysis: reportAnalysis })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                ...corsHeaders
            },
            body: JSON.stringify({ error: "Internal Server Error" })
        }
    }
}
