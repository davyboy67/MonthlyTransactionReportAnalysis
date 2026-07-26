import axios from 'axios';
import { IReportAnalysis, SaveReportAnalysisRequest } from '../models/IReportAnalysis';
import type { IBudget } from '../models/IBudget';

declare const __API_URL__: string;
const VITE_API_URL =
  typeof __API_URL__ !== 'undefined' ? __API_URL__ : 'http://localhost:3001/api/v1';

const TOKEN_KEY = 'authToken';

const globalScope = globalThis as unknown as {
  localStorage?: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
  };
  dispatchEvent?: (event: unknown) => boolean;
  CustomEvent?: new (type: string) => unknown;
};

let authToken: string | null = globalScope.localStorage?.getItem(TOKEN_KEY) ?? null;

function setToken(token: string): void {
  authToken = token;
  globalScope.localStorage?.setItem(TOKEN_KEY, token);
}

function clearToken(): void {
  authToken = null;
  globalScope.localStorage?.removeItem(TOKEN_KEY);
}

function emitLogout(): void {
  if (globalScope.dispatchEvent && globalScope.CustomEvent) {
    globalScope.dispatchEvent(new globalScope.CustomEvent('auth:logout'));
  }
}

const api = axios.create({ baseURL: VITE_API_URL });

api.interceptors.request.use(config => {
  if (authToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error?.response?.status === 401) {
      clearToken();
      emitLogout();
    }
    return Promise.reject(error);
  }
);

export interface UserProfile {
  userId: number;
  firstName: string;
  lastName: string;
}

export interface LoginResponse {
  token: string;
  user: UserProfile;
}

export const apiClient = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await api.post('/Login', { email, password });
    setToken(response.data.token);
    return response.data;
  },
  getProfile: async (): Promise<UserProfile> => {
    const response = await api.get('/Me');
    return response.data.user;
  },
  logout: (): void => {
    clearToken();
    emitLogout();
  },
  isAuthenticated: (): boolean => authToken != null,
  saveReportAnalysis: async (reportAnalysis: IReportAnalysis) => {
    try {
      const requestBody = {} as SaveReportAnalysisRequest;
      const reportAnalysisReq: IReportAnalysis = { ...reportAnalysis };
      requestBody.ReportAnalysis = reportAnalysisReq;
      await api.post(`/SaveReportInformation`, requestBody);
    } catch (error) {
      console.error('Error saving report analysis:', error);
      throw error;
    }
  },
  processStatementFile: async (file: File, month: number, year: number) => {
    try {
      const formData = new FormData();
      formData.append('month', String(month));
      formData.append('year', String(year));
      formData.append('file', file);

      const response = await api.post(`/ProcessStatementFile`, formData, {
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
      const response = await api.get(`/GetBudgetForMonth`, {
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
      await api.post(`/SaveBudget`, { budget });
    } catch (error) {
      console.error('Error saving budget:', error);
      throw error;
    }
  },
  getLatestBudget: async (): Promise<{ budget: IBudget | null }> => {
    try {
      const response = await api.get(`/GetLatestBudget`);
      return response.data;
    } catch (error) {
      console.error('Error fetching latest budget:', error);
      throw error;
    }
  },
  getReportForMonth: async (
    month: number,
    year: number
  ): Promise<{ ReportAnalysis: IReportAnalysis | null }> => {
    try {
      const response = await api.get(`/GetReportForMonth`, {
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
      const response = await api.get(`/GetTrendAnalysis`, {
        params: { months },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching trend analysis:', error);
      throw error;
    }
  },
  updateTransactionCategories: async (
    updates: Array<{ id: number; category: string }>
  ): Promise<void> => {
    try {
      await api.put(`/UpdateTransactionCategories`, { updates });
    } catch (error) {
      console.error('Error updating transaction categories:', error);
      throw error;
    }
  },
};
