import apiClient from './client';
import { ApiResponse } from '../types';

export interface CreateReportRequest {
  targetType: 'post' | 'comment' | 'user';
  targetId: number;
  reason: string;
}

/**
 * Create a report
 */
export const createReport = async (data: CreateReportRequest): Promise<void> => {
  await apiClient.post<ApiResponse<void>>('/reports', data);
};

/**
 * Get all reports (admin only)
 */
export const getReports = async (params: { status?: string; limit?: number; offset?: number } = {}): Promise<any[]> => {
  const response = await apiClient.get<ApiResponse<{ reports: any[] }>>('/reports', { params });
  return response.data.data.reports;
};

/**
 * Update report status (admin only)
 */
export const updateReportStatus = async (reportId: number, status: string): Promise<void> => {
  await apiClient.put(`/reports/${reportId}/status`, { status });
};

