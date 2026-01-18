import axios from 'axios';
import { IReportAnalysis, SaveReportAnalysisRequest } from '../models/IReportAnalysis';

const API_URL = 'https://localhost:7152/api/v1';

export const apiClient = {
  saveReportAnalysis: async (reportAnalysis: IReportAnalysis) => {
    try {
      let requestBody = {} as SaveReportAnalysisRequest;
      let reportAnalysisReq = {} as IReportAnalysis;
      reportAnalysisReq.date = reportAnalysis.date;
      reportAnalysisReq.totalExpenses = reportAnalysis.totalExpenses;
      reportAnalysisReq.totalIncome = reportAnalysis.totalIncome;
      reportAnalysisReq.categorySummaries = reportAnalysis.categorySummaries;
      requestBody.reportAnalysis = reportAnalysis;
      await axios.post(`${API_URL}/SaveReportInformation`, requestBody);
    } catch (error) {
      console.error('Error saving report analysis:', error);
      throw error;
    }
  },
  RetrieveReportAnalysis: async (date: Date, id?: number) => {
    try {
      const requestBody = {
        Date: date,
        ID: id ? id : null
      }
      const response = await axios.post(`${API_URL}/RetrieveDashboardDetails`, requestBody);
      return response.data;
    } catch (error) {
      console.error('Error retrieving report analysis:', error);
      throw error;
    }
  }
};
