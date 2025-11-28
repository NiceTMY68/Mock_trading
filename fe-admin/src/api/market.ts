import apiClient from './client';
import {
  ApiResponse,
  CandlestickPoint,
  MarketCoin,
  MarketListResponse,
  MarketOverview,
  PaginationMeta,
  TickerDetails
} from '../types';

const unwrap = <T>(response: { data: ApiResponse<T> }) => {
  if (!response.data.success) {
    throw new Error('API response unsuccessful');
  }
  return response.data.data;
};

export const fetchMarketOverview = async (): Promise<MarketOverview> => {
  const response = await apiClient.get<ApiResponse<MarketOverview>>('/market/overview');
  return unwrap(response);
};

export const fetchTopCoins = async (params: { limit?: number; sortBy?: string; quote?: string | null } = {}) => {
  const response = await apiClient.get<ApiResponse<MarketCoin[]>>('/market/top', {
    params: {
      limit: params.limit ?? 8,
      sortBy: params.sortBy ?? 'volume',
      quote: params.quote ?? undefined
    }
  });
  return unwrap(response);
};

export const fetchTrendingCoins = async (limit = 8) => {
  const response = await apiClient.get<ApiResponse<{ items: MarketCoin[] }>>('/market/trending', {
    params: { limit }
  });
  const data = unwrap(response);
  return Array.isArray(data.items) ? data.items : data;
};

export const fetchLosers = async (limit = 8) => {
  const response = await apiClient.get<ApiResponse<{ items: MarketCoin[] }>>('/market/losers', {
    params: { limit }
  });
  const data = unwrap(response);
  return Array.isArray(data.items) ? data.items : data;
};

export const fetchNewListings = async (params: { days?: number; limit?: number } = {}) => {
  const response = await apiClient.get<ApiResponse<{ items: MarketCoin[] }>>('/market/new', {
    params: {
      days: params.days ?? 7,
      limit: params.limit ?? 8
    }
  });
  const data = unwrap(response);
  return Array.isArray(data.items) ? data.items : data;
};

export const fetchMarketList = async (params: {
  page?: number;
  size?: number;
  sortBy?: string;
  quote?: string | null;
  minMarketCap?: number | null;
  maxMarketCap?: number | null;
  minVolume?: number | null;
  maxVolume?: number | null;
  minTradeCount?: number | null;
  maxTradeCount?: number | null;
} = {}): Promise<MarketListResponse> => {
  const response = await apiClient.get<ApiResponse<MarketCoin[]>>('/market/list', {
    params: {
      page: params.page ?? 0,
      size: params.size ?? 100,
      sortBy: params.sortBy ?? 'volume',
      quote: params.quote ?? undefined,
      minMarketCap: params.minMarketCap ?? undefined,
      maxMarketCap: params.maxMarketCap ?? undefined,
      minVolume: params.minVolume ?? undefined,
      maxVolume: params.maxVolume ?? undefined,
      minTradeCount: params.minTradeCount ?? undefined,
      maxTradeCount: params.maxTradeCount ?? undefined
    }
  });

  const data = unwrap(response);
  const pagination = response.data.pagination as PaginationMeta | undefined;

  return {
    items: data,
    pagination: pagination ?? {
      page: params.page ?? 0,
      limit: params.size ?? 100,
      total: data.length,
      pages: 1
    }
  };
};

export const fetchQuoteAssets = async (): Promise<string[]> => {
  const response = await apiClient.get<ApiResponse<{ quotes: string[] }>>('/market/quotes');
  const data = unwrap(response);
  return Array.isArray(data.quotes) ? data.quotes : data;
};

export const fetchKlines = async (params: {
  symbol: string;
  interval: string;
  limit?: number;
  startTime?: number;
  endTime?: number;
}): Promise<CandlestickPoint[]> => {
  const response = await apiClient.get<ApiResponse<{ symbol: string; interval: string; klines: CandlestickPoint[] }>>(
    '/market/klines',
    { params }
  );
  const data = unwrap(response);
  return data.klines;
};

export const fetchTicker = async (symbol: string): Promise<TickerDetails> => {
  const response = await apiClient.get<ApiResponse<{ ticker: TickerDetails }>>(`/market/ticker/${symbol}`);
  const data = unwrap(response);
  return data.ticker || (data as unknown as TickerDetails);
};
