import "reflect-metadata";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DashboardRepository } from "../../../packages/backend/src/repositories/DashboardRepository";
import { AppDataSource } from "../../../packages/backend/src/database/dataSource";
import {
  DataAnalysisService,
  StatementExtractionService,
  TransactionInfoHandler,
} from "@transaction-report/shared";
import { DashboardService } from "../../../packages/backend/src/services/DashboardService";
import * as multipart from "parse-multipart-data";
import { ReportNotSavedError } from "packages/shared/src/requestResponseModels/errorModels";

let isInitialized = false;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

function extractFileBuffer(event: APIGatewayProxyEvent): Buffer | null {
  const contentType =
    event.headers["Content-Type"] || event.headers["content-type"] || "";

  // Handle multipart/form-data (sent by frontend via FormData)
  if (contentType.includes("multipart/form-data")) {
    const boundary = multipart.getBoundary(contentType);
    if (!boundary) {
      console.error(
        "No multipart boundary found in Content-Type:",
        contentType,
      );
      return null;
    }

    const bodyBuffer = event.isBase64Encoded
      ? Buffer.from(event.body!, "base64")
      : Buffer.from(event.body!, "utf-8");

    const parts = multipart.parse(bodyBuffer, boundary);
    const filePart = parts.find((p) => p.name === "file");

    if (!filePart || !filePart.data) {
      console.error(
        'No "file" part found in multipart body. Parts found:',
        parts.map((p) => p.name),
      );
      return null;
    }

    return filePart.data;
  }

  // Fallback: handle JSON body with base64-encoded fileContent
  try {
    const body = JSON.parse(event.body || "{}");
    if (body.fileContent) {
      return Buffer.from(body.fileContent, "base64");
    }
  } catch {
    console.error("Failed to parse body as JSON");
  }

  return null;
}

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    if (!isInitialized) {
      await AppDataSource.initialize();
      isInitialized = true;
    }

    const fileBuffer = extractFileBuffer(event);

    if (!fileBuffer) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
        body: JSON.stringify({
          error:
            "File content is required. Send as multipart/form-data with a 'file' field, or as JSON with a base64-encoded 'fileContent' field.",
        }),
      };
    }

    const dashboardRepository = new DashboardRepository(AppDataSource);
    const transactionInfoHandler = new TransactionInfoHandler();
    const dataAnalysisService = new DataAnalysisService(
      transactionInfoHandler,
      false,
    );
    const statementExtractionService = new StatementExtractionService();

    const dashboardService = new DashboardService(
      dashboardRepository,
      statementExtractionService,
      dataAnalysisService,
    );

    const reportAnalysis =
      await dashboardService.processStatementFile(fileBuffer);

    if (!reportAnalysis) {
      throw new ReportNotSavedError(new Date());
    }

    await dashboardService.saveDashboardDetails(reportAnalysis);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
      body: JSON.stringify({ ReportAnalysis: reportAnalysis }),
    };
  } catch (error) {
    if (error instanceof ReportNotSavedError) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: error.message }),
      };
    }
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
      body: JSON.stringify({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
