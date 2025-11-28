import apiClient from './client';

export interface Holding {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice?: number;
  currentValue?: number;
  costBasis?: number;
  pnl?: number;
  pnlPercent?: number;
  notes?: string;
  addedAt?: string;
}

export interface Portfolio {
  id: number;
  holdings: Holding[];
  totalValueUsd: number;
  totalCostBasis: number;
  totalPnl: number;
  totalPnlPercent: number;
  updatedAt: string;
}

export interface PortfolioSummary {
  totalValueUsd: number;
  totalCostBasis: number;
  totalPnl: number;
  totalPnlPercent: number;
  holdingsCount: number;
  topGainers: Holding[];
  topLosers: Holding[];
}

export interface AddHoldingRequest {
  symbol: string;
  quantity: number;
  avgPrice: number;
  notes?: string;
}

export interface UpdateHoldingRequest {
  quantity?: number;
  avgPrice?: number;
  notes?: string;
}

/**
 * Get portfolio for current user
 */
export const getPortfolio = async (): Promise<Portfolio> => {
  const response = await apiClient.get('/portfolio');
  return response.data.data.portfolio;
};

/**
 * Get portfolio summary
 */
export const getPortfolioSummary = async (): Promise<PortfolioSummary> => {
  const response = await apiClient.get('/portfolio/summary');
  return response.data.data.summary;
};

/**
 * Add holding to portfolio
 */
export const addHolding = async (data: AddHoldingRequest): Promise<Holding> => {
  const response = await apiClient.post('/portfolio/holdings', data);
  return response.data.data.holding;
};

/**
 * Update holding
 */
export const updateHolding = async (symbol: string, data: UpdateHoldingRequest): Promise<Holding> => {
  const response = await apiClient.put(`/portfolio/holdings/${symbol}`, data);
  return response.data.data.holding;
};

/**
 * Remove holding from portfolio
 */
export const removeHolding = async (symbol: string): Promise<void> => {
  await apiClient.delete(`/portfolio/holdings/${symbol}`);
};

export interface PortfolioSnapshot {
  id: number;
  totalValue: number;
  dailyChange: number | null;
  dailyChangePercent: number | null;
  snapshotData?: any;
  createdAt: string;
}

/**
 * Get portfolio snapshots
 */
export const getPortfolioSnapshots = async (days = 30): Promise<PortfolioSnapshot[]> => {
  const response = await apiClient.get('/portfolio/snapshots', {
    params: { days }
  });
  return response.data.data.snapshots;
};

/**
 * Create portfolio snapshot
 */
export const createPortfolioSnapshot = async (): Promise<PortfolioSnapshot> => {
  const response = await apiClient.post('/portfolio/snapshots');
  return response.data.data.snapshot;
};

