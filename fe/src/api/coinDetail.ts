import apiClient from './client';
import { ApiResponse, CandlestickPoint, TickerDetails } from '../types';
import type { TickerDetails as TickerDetailsType } from '../types';

const unwrap = <T>(response: { data: ApiResponse<T> }) => {
  if (!response.data.success) {
    throw new Error('API response unsuccessful');
  }
  return response.data.data;
};

export interface OrderBookEntry {
  price: number;
  quantity: number;
}

export interface OrderBook {
  symbol: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  lastUpdateId: number;
}

export interface Trade {
  id: number;
  price: number;
  quantity: number;
  quoteQuantity: number;
  time: number;
  isBuyerMaker: boolean;
}

/**
 * Get ticker (24h stats) for a symbol
 */
export const getTicker = async (symbol: string): Promise<TickerDetailsType> => {
  const response = await apiClient.get<ApiResponse<{ ticker: TickerDetailsType }>>(`/market/ticker/${symbol}`);
  const data = unwrap(response);
  return data.ticker || (data as unknown as TickerDetailsType);
};

/**
 * Get candlestick data (klines)
 */
export const getKlines = async (params: {
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

/**
 * Get order book
 */
export const getOrderBook = async (symbol: string, limit = 20): Promise<OrderBook> => {
  const response = await apiClient.get<ApiResponse<{ orderBook: OrderBook }>>(`/market/orderbook/${symbol}`, {
    params: { limit }
  });
  const data = unwrap(response);
  return data.orderBook;
};

/**
 * Get recent trades
 */
export const getRecentTrades = async (symbol: string, limit = 50): Promise<Trade[]> => {
  const response = await apiClient.get<ApiResponse<{ trades: Trade[] }>>(`/market/trades/${symbol}`, {
    params: { limit }
  });
  const data = unwrap(response);
  return data.trades;
};

