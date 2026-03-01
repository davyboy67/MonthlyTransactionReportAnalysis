import "reflect-metadata";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DashboardRepository } from "../../../packages/backend/src/repositories/DashboardRepository";
import { AppDataSource } from "../../../packages/backend/src/database/dataSource";
import { DataAnalysisService, StatementExtractionService, TransactionInfoHandler, IReportAnalysis } from "@transaction-report/shared";
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

        console.log('Raw event body:', event.body);
        
        const body = JSON.parse(event.body || '{}');
        const reportAnalysis: IReportAnalysis = body.reportAnalysis;

        console.log('Parsed report analysis:', reportAnalysis);

        if (!reportAnalysis) {
            return {
                statusCode: 400,
                headers: {
                    "Content-Type": "application/json",
                    ...corsHeaders
                },
                body: JSON.stringify({ error: "Report analysis data is required" })
            };
        }

        reportAnalysis.Date = new Date(reportAnalysis.Date);

        const dashboardRepository = new DashboardRepository(AppDataSource);
        const transactionInfoHandler = new TransactionInfoHandler()
        const dataAnalysisService = new DataAnalysisService(transactionInfoHandler, false);
        const statementExtractionService = new StatementExtractionService();

        const dashboardService = new DashboardService(dashboardRepository, statementExtractionService, dataAnalysisService);

        await dashboardService.saveDashboardDetails(reportAnalysis);

        console.log('Report saved successfully');

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                ...corsHeaders
            },
            body: JSON.stringify({ message: "Report saved successfully" })
        };
    } catch (error) {
        console.error('Error saving report information:', error);
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
