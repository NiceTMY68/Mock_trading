import apiClient from './client';
import { ApiResponse } from '../types';

const unwrap = <T>(response: { data: ApiResponse<T> }) => {
  if (!response.data.success) {
    throw new Error('API response unsuccessful');
  }
  return response.data.data;
};

export interface NewsArticle {
  article_id?: string;
  id?: string;
  title: string;
  description?: string;
  content?: string;
  link?: string;
  url?: string;
  image_url?: string;
  urlToImage?: string;
  pubDate?: string;
  publishedAt?: string;
  source_id?: string;
  source?: {
    id?: string;
    name: string;
  };
  creator?: string[];
  author?: string;
  category?: string[];
  sentiment?: string;
  keywords?: string[];
}

export interface NewsResponse {
  articles?: NewsArticle[];
  results?: NewsArticle[];
  totalResults?: number;
  status?: string;
}

/**
 * Get crypto news
 */
export const getCryptoNews = async (params?: {
  page?: number;
  pageSize?: number;
  category?: string;
}): Promise<NewsResponse> => {
  const response = await apiClient.get<ApiResponse<NewsArticle[]>>('/news', {
    params: {
      page: params?.page || 1,
      size: params?.pageSize || 20,
      category: params?.category || 'crypto'
    }
  });
  const data = unwrap(response);
  const articles = Array.isArray(data) 
    ? data 
    : (data as any)?.results || (data as any)?.articles || [];
  const totalResults = (data as any)?.totalResults || (response.data as any)?.pagination?.total || articles.length;
  return { articles, results: articles, totalResults };
};

/**
 * Search news by keyword
 */
export const searchNews = async (params: {
  q: string;
  page?: number;
  pageSize?: number;
}): Promise<NewsResponse> => {
  const response = await apiClient.get<ApiResponse<NewsArticle[]>>('/news/search', {
    params: {
      q: params.q,
      page: params.page || 1,
      size: params.pageSize || 20
    }
  });
  const data = unwrap(response);
  const articles = Array.isArray(data) 
    ? data 
    : (data as any)?.results || (data as any)?.articles || [];
  const totalResults = (data as any)?.totalResults || (response.data as any)?.pagination?.total || articles.length;
  return { articles, results: articles, totalResults };
};

/**
 * Get news by category
 */
export const getNewsByCategory = async (params: {
  category: string;
  page?: number;
  pageSize?: number;
}): Promise<NewsResponse> => {
  const response = await apiClient.get<ApiResponse<NewsArticle[]>>(`/news/category/${params.category}`, {
    params: {
      page: params.page || 1,
      size: params.pageSize || 20
    }
  });
  const data = unwrap(response);
  const articles = Array.isArray(data) 
    ? data 
    : (data as any)?.results || (data as any)?.articles || [];
  const totalResults = (data as any)?.totalResults || (response.data as any)?.pagination?.total || articles.length;
  return { articles, results: articles, totalResults };
};

