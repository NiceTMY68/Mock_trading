import apiClient from './client';
import { ApiResponse } from '../types';

export interface Activity {
  type: 'post' | 'comment' | 'watchlist';
  id: number;
  title: string;
  description?: string;
  createdAt: string;
  metadata?: {
    postId?: number;
    commentId?: number;
    symbol?: string;
    watchlistName?: string;
  };
}

/**
 * Get recent activity for current user
 */
export const getRecentActivity = async (params: { limit?: number; offset?: number } = {}): Promise<Activity[]> => {
  const response = await apiClient.get<ApiResponse<{ activities: Activity[] }>>('/activity', { params });
  return response.data.data.activities;
};

