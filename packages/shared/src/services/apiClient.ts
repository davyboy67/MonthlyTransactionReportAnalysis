import axios from 'axios';
import { IReportAnalysis, SaveReportAnalysisRequest } from '../models/IReportAnalysis';

// Updated to point to Node.js backend
// @ts-ignore - import.metas.env is what should be used to get secrets in a vite env
const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export const apiClient = {
  saveReportAnalysis: async (reportAnalysis: IReportAnalysis) => {
    try {
      let requestBody = {} as SaveReportAnalysisRequest;
      let reportAnalysisReq = {} as IReportAnalysis;
      reportAnalysisReq.Date = reportAnalysis.Date;
      reportAnalysisReq.TotalExpenses = reportAnalysis.TotalExpenses;
      reportAnalysisReq.TotalIncome = reportAnalysis.TotalIncome;
      reportAnalysisReq.CategorySummaries = reportAnalysis.CategorySummaries;
      requestBody.ReportAnalysis = reportAnalysisReq;
      await axios.post(`${VITE_API_URL}/SaveReportInformation`, requestBody);
    } catch (error) {
      console.error('Error saving report analysis:', error);
      throw error;
    }
  },
  RetrieveReportAnalysis: async (date?: Date, id?: number) => {
    try {
      const requestBody = {
        Date: date,
        id: id ? id : null
      }
      const response = await axios.post(`${VITE_API_URL}/RetrieveDashboardDetails`, requestBody);
      return response.data;
    } catch (error) {
      console.error('Error retrieving report analysis:', error);
      throw error;
    }
  },
  processStatementFile: async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(`${VITE_API_URL}/ProcessStatementFile`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error processing statement file:', error);
      throw error;
    }
  }
};
