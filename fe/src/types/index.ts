export interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface MarketCoin {
  symbol: string;
  baseAsset?: string | null;
  quoteAsset?: string | null;
  lastPrice: number;
  openPrice?: number;
  highPrice?: number;
  lowPrice?: number;
  priceChange?: number;
  priceChangePercent: number;
  volume: number;
  quoteVolume: number;
  count: number; // Trade count (number of trades in 24h)
  marketCap?: number | null; // Estimated market cap
  listDate?: number | null;
}

export interface MarketOverview {
  totalSymbols: number;
  totalVolume: number;
  totalTrades: number;
  bestPerformers: MarketCoin[];
  worstPerformers: MarketCoin[];
  timestamp: string;
}

export interface MarketListResponse {
  items: MarketCoin[];
  pagination: PaginationMeta;
}

export interface CandlestickPoint {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TickerDetails {
  symbol: string;
  lastPrice?: number;
  price?: number;
  openPrice?: number;
  open?: number;
  highPrice?: number;
  high?: number;
  lowPrice?: number;
  low?: number;
  volume?: number;
  quoteVolume?: number;
  priceChange?: number;
  priceChangePercent?: number;
  count?: number;
  baseAsset?: string;
  quoteAsset?: string;
  timestamp?: string;
}

export interface CandlestickData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CoinData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  chartData: CandlestickData[];
}
