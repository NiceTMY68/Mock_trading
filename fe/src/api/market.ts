import apiClient from './client';
import { TopMoversData, CoinData } from '../types';

// Mock data generator for development until backend is ready
const generateMockCandlestickData = () => {
  const data = [];
  const now = Date.now();
  let price = 40000 + Math.random() * 20000;
  
  for (let i = 30; i >= 0; i--) {
    const time = now - i * 3600000; // hourly data for 30 hours
    const open = price;
    const change = (Math.random() - 0.5) * 1000;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * 500;
    const low = Math.min(open, close) - Math.random() * 500;
    
    data.push({
      time,
      open,
      high,
      low,
      close,
      volume: Math.random() * 1000000,
    });
    
    price = close;
  }
  
  return data;
};

const mockTopCoins: CoinData[] = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    price: 68234.50,
    change24h: 3.45,
    marketCap: 1340000000000,
    volume24h: 28500000000,
    chartData: generateMockCandlestickData(),
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    price: 3456.78,
    change24h: -1.23,
    marketCap: 415000000000,
    volume24h: 15200000000,
    chartData: generateMockCandlestickData(),
  },
  {
    symbol: 'USDT',
    name: 'Tether',
    price: 1.00,
    change24h: 0.01,
    marketCap: 97000000000,
    volume24h: 45000000000,
    chartData: generateMockCandlestickData(),
  },
  {
    symbol: 'BNB',
    name: 'Binance Coin',
    price: 612.34,
    change24h: 2.67,
    marketCap: 89000000000,
    volume24h: 1800000000,
    chartData: generateMockCandlestickData(),
  },
];

export const fetchTopCoins = async (): Promise<TopMoversData> => {
  try {
    // Try to fetch from backend API
    const response = await apiClient.get<TopMoversData>('/market/top-movers');
    return response.data;
  } catch (error) {
    // Fallback to mock data if backend is not available
    console.warn('Using mock data for top coins');
    return { topCoins: mockTopCoins };
  }
};

export const fetchCoinPrice = async (symbol: string) => {
  try {
    const response = await apiClient.get(`/coins/${symbol}/price?tf=1d&limit=100`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch coin price:', error);
    throw error;
  }
};

