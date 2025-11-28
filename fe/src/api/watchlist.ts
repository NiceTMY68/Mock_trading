import apiClient from './client';

export interface Watchlist {
  id: number;
  name: string;
  symbols: string[];
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWatchlistRequest {
  name?: string;
}

export interface UpdateWatchlistRequest {
  name?: string;
  symbols?: string[];
  orderIndex?: number;
}

export interface AddSymbolRequest {
  symbol: string;
}

export interface ReorderWatchlistsRequest {
  watchlistIds: number[];
}

/**
 * Get all watchlists for current user
 */
export const getWatchlists = async (): Promise<Watchlist[]> => {
  const response = await apiClient.get('/watchlists');
  return response.data.data.watchlists;
};

/**
 * Create new watchlist
 */
export const createWatchlist = async (data: CreateWatchlistRequest): Promise<Watchlist> => {
  const response = await apiClient.post('/watchlists', data);
  return response.data.data.watchlist;
};

/**
 * Update watchlist
 */
export const updateWatchlist = async (id: number, data: UpdateWatchlistRequest): Promise<Watchlist> => {
  const response = await apiClient.put(`/watchlists/${id}`, data);
  return response.data.data.watchlist;
};

/**
 * Delete watchlist
 */
export const deleteWatchlist = async (id: number): Promise<void> => {
  await apiClient.delete(`/watchlists/${id}`);
};

/**
 * Add symbol to watchlist
 */
export const addSymbolToWatchlist = async (id: number, symbol: string): Promise<Watchlist> => {
  const response = await apiClient.post(`/watchlists/${id}/symbols`, { symbol });
  return response.data.data.watchlist;
};

/**
 * Remove symbol from watchlist
 */
export const removeSymbolFromWatchlist = async (id: number, symbol: string): Promise<Watchlist> => {
  const response = await apiClient.delete(`/watchlists/${id}/symbols/${symbol}`);
  return response.data.data.watchlist;
};

/**
 * Reorder watchlists
 */
export const reorderWatchlists = async (watchlistIds: number[]): Promise<Watchlist[]> => {
  const response = await apiClient.post('/watchlists/reorder', { watchlistIds });
  return response.data.data.watchlists;
};

/**
 * Get all symbols from all user watchlists
 */
export const getAllWatchlistSymbols = async (): Promise<string[]> => {
  const response = await apiClient.get('/watchlists/symbols');
  return response.data.data.symbols;
};

