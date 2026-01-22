"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiClient = void 0;
const axios_1 = __importDefault(require("axios"));
// Updated to point to Node.js backend
const API_URL = 'http://localhost:3001/api/v1';
exports.apiClient = {
    saveReportAnalysis: async (reportAnalysis) => {
        try {
            let requestBody = {};
            let reportAnalysisReq = {};
            reportAnalysisReq.Date = reportAnalysis.Date;
            reportAnalysisReq.TotalExpenses = reportAnalysis.TotalExpenses;
            reportAnalysisReq.TotalIncome = reportAnalysis.TotalIncome;
            reportAnalysisReq.CategorySummaries = reportAnalysis.CategorySummaries;
            requestBody.reportAnalysis = reportAnalysisReq;
            await axios_1.default.post(`${API_URL}/SaveReportInformation`, requestBody);
        }
        catch (error) {
            console.error('Error saving report analysis:', error);
            throw error;
        }
    },
    RetrieveReportAnalysis: async (date, id) => {
        try {
            const requestBody = {
                Date: date,
                ID: id ? id : null
            };
            const response = await axios_1.default.post(`${API_URL}/RetrieveDashboardDetails`, requestBody);
            return response.data;
        }
        catch (error) {
            console.error('Error retrieving report analysis:', error);
            throw error;
        }
    },
    processStatementFile: async (file) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await axios_1.default.post(`${API_URL}/ProcessStatementFile`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        }
        catch (error) {
            console.error('Error processing statement file:', error);
            throw error;
        }
    }
};
//# sourceMappingURL=apiClient.js.map