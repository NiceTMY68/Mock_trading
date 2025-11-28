import apiClient from './client';
import { ApiResponse } from '../types';

export interface SavedSearch {
  id: number;
  userId: number;
  name: string;
  searchType: 'coins' | 'posts' | 'news' | 'all';
  queryParams: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavedSearchRequest {
  name: string;
  searchType: 'coins' | 'posts' | 'news' | 'all';
  queryParams: Record<string, any>;
}

/**
 * Get saved searches
 */
export const getSavedSearches = async (): Promise<SavedSearch[]> => {
  const response = await apiClient.get<ApiResponse<{ searches: SavedSearch[] }>>('/saved-searches');
  return response.data.data.searches;
};

/**
 * Create saved search
 */
export const createSavedSearch = async (data: CreateSavedSearchRequest): Promise<SavedSearch> => {
  const response = await apiClient.post<ApiResponse<{ search: SavedSearch }>>('/saved-searches', data);
  return response.data.data.search;
};

/**
 * Delete saved search
 */
export const deleteSavedSearch = async (id: number): Promise<void> => {
  await apiClient.delete(`/saved-searches/${id}`);
};

