import axios from 'axios';
import { IReportAnalysis, SaveReportAnalysisRequest } from '../models/IReportAnalysis';
import type { IBudget } from '../models/IBudget';

declare const __API_URL__: string;
const VITE_API_URL = typeof __API_URL__ !== 'undefined' ? __API_URL__ : 'http://localhost:3001/api/v1';

export const apiClient = {
  saveReportAnalysis: async (reportAnalysis: IReportAnalysis) => {
    try {
      const requestBody = {} as SaveReportAnalysisRequest;
      const reportAnalysisReq: IReportAnalysis = {...reportAnalysis};
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
  },
  getBudgetForMonth: async (month: number, year: number): Promise<{ budget: IBudget }> => {
    try {
      const response = await axios.get(`${VITE_API_URL}/GetBudgetForMonth`, {
        params: { month, year },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching budget:', error);
      throw error;
    }
  },
  saveOrUpdateBudget: async (budget: IBudget): Promise<void> => {
    try {
      await axios.post(`${VITE_API_URL}/SaveBudget`, { budget });
    } catch (error) {
      console.error('Error saving budget:', error);
      throw error;
    }
  },
  getLatestBudget: async (): Promise<{ budget: IBudget | null }> => {
    try {
      const response = await axios.get(`${VITE_API_URL}/GetLatestBudget`);
      return response.data;
    } catch (error) {
      console.error('Error fetching latest budget:', error);
      throw error;
    }
  },
  getReportForMonth: async (month: number, year: number): Promise<{ ReportAnalysis: IReportAnalysis | null }> => {
    try {
      const response = await axios.get(`${VITE_API_URL}/GetReportForMonth`, {
        params: { month, year },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching report for month:', error);
      throw error;
    }
  },
  getTrendAnalysis: async (months = 12): Promise<{ reports: IReportAnalysis[] }> => {
    try {
      const response = await axios.get(`${VITE_API_URL}/GetTrendAnalysis`, {
        params: { months },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching trend analysis:', error);
      throw error;
    }
  },
  updateTransactionCategories: async (updates: Array<{ id: number; category: string }>): Promise<void> => {
    try {
      await axios.put(`${VITE_API_URL}/UpdateTransactionCategories`, { updates });
    } catch (error) {
      console.error('Error updating transaction categories:', error);
      throw error;
    }
  },
};
