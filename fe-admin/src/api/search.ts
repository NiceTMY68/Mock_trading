import apiClient from './client';
import { ApiResponse } from '../types';

export interface SearchCoin {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  price: number | null;
  change24h: number | null;
  volume24h: number | null;
}

export interface SearchPost {
  id: number;
  title: string;
  content: string;
  author: {
    id: number;
    name: string;
    avatar: string | null;
  };
  commentsCount: number;
  reactionsCount: number;
  createdAt: string;
  tags: string[];
}

export interface SearchNews {
  id: string;
  title: string;
  description?: string;
  url: string;
  imageUrl?: string;
  source?: string;
  publishedAt: string;
  category?: string;
}

export interface SearchResults {
  query: string;
  coins: SearchCoin[];
  posts: SearchPost[];
  news: SearchNews[];
  totalResults: number;
}

/**
 * Global search
 */
export const globalSearch = async (params: {
  q: string;
  type?: 'all' | 'coins' | 'posts' | 'news';
  limit?: number;
}): Promise<SearchResults> => {
  const response = await apiClient.get<ApiResponse<SearchResults>>('/search', {
    params: {
      q: params.q,
      type: params.type || 'all',
      limit: params.limit || 10
    }
  });
  return response.data.data;
};

