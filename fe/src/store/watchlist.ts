import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import * as watchlistAPI from '../api/watchlist';
import { Watchlist } from '../api/watchlist';
import { useAuthStore } from './auth';

interface WatchlistState {
  // Legacy: single watchlist for backward compatibility (anonymous users)
  symbols: string[];
  selectedSymbol: string;
  
  // New: multiple watchlists (authenticated users)
  watchlists: Watchlist[];
  activeWatchlistId: number | null;
  
  // Actions
  addSymbol: (symbol: string) => void;
  removeSymbol: (symbol: string) => void;
  setSelectedSymbol: (symbol: string) => void;
  
  // Watchlist management
  setWatchlists: (watchlists: Watchlist[]) => void;
  setActiveWatchlist: (id: number | null) => void;
}

const normalizeSymbol = (symbol: string) => symbol.toUpperCase().trim();

export const useWatchlistStore = create(
  persist<WatchlistState>(
    (set, get) => ({
      // Legacy state (for anonymous users)
      symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
      selectedSymbol: 'BTCUSDT',
      
      // New state (for authenticated users)
      watchlists: [],
      activeWatchlistId: null,
      
      // Legacy actions (local storage only)
      addSymbol: (symbol) => {
        const normalized = normalizeSymbol(symbol);
        const { symbols } = get();
        if (!normalized || symbols.includes(normalized)) {
          return;
        }
        set({
          symbols: [...symbols, normalized]
        });
      },
      removeSymbol: (symbol) => {
        const normalized = normalizeSymbol(symbol);
        set((state) => ({
          symbols: state.symbols.filter((item) => item !== normalized),
          selectedSymbol:
            state.selectedSymbol === normalized 
              ? state.symbols.find((item) => item !== normalized) || 'BTCUSDT' 
              : state.selectedSymbol
        }));
      },
      setSelectedSymbol: (symbol) => {
        const normalized = normalizeSymbol(symbol);
        set({ selectedSymbol: normalized });
      },
      
      // Watchlist management
      setWatchlists: (watchlists) => {
        set({ watchlists });
        // Sync with legacy symbols for backward compatibility
        if (watchlists.length > 0) {
          const allSymbols = watchlists.flatMap(w => w.symbols);
          set({ symbols: [...new Set(allSymbols)] });
        }
      },
      setActiveWatchlist: (id) => {
        set({ activeWatchlistId: id });
      }
    }),
    {
      name: 'crypto-watchlist'
    }
  )
);

/**
 * Hook to get all symbols from active watchlist or all watchlists
 */
export const useWatchlistSymbols = (): string[] => {
  const { isAuthenticated } = useAuthStore();
  const { watchlists, activeWatchlistId, symbols } = useWatchlistStore();

  if (!isAuthenticated) {
    return symbols; // Legacy: use local storage
  }

  if (activeWatchlistId && Array.isArray(watchlists)) {
    const watchlist = watchlists.find((w: Watchlist) => w.id === activeWatchlistId);
    return watchlist?.symbols || [];
  }

  // Return all symbols from all watchlists
  if (Array.isArray(watchlists)) {
    return [...new Set(watchlists.flatMap((w: Watchlist) => w.symbols || []))];
  }
  
  return [];
};

/**
 * Hook to manage watchlists (for authenticated users)
 */
export const useWatchlists = () => {
  const { isAuthenticated } = useAuthStore();
  const { watchlists, setWatchlists, activeWatchlistId, setActiveWatchlist } = useWatchlistStore();
  const queryClient = useQueryClient();

  // Fetch watchlists if authenticated
  const { data, isLoading, error } = useQuery({
    queryKey: ['watchlists'],
    queryFn: watchlistAPI.getWatchlists,
    enabled: isAuthenticated
  });

  // Handle data updates (replaces deprecated onSuccess)
  useEffect(() => {
    if (data) {
      setWatchlists(data);
      if (!activeWatchlistId && data.length > 0) {
        setActiveWatchlist(data[0].id);
      }
    }
  }, [data, activeWatchlistId, setWatchlists, setActiveWatchlist]);

  // Create watchlist
  const createMutation = useMutation({
    mutationFn: watchlistAPI.createWatchlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
    }
  });

  // Update watchlist
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: watchlistAPI.UpdateWatchlistRequest }) =>
      watchlistAPI.updateWatchlist(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
    }
  });

  // Delete watchlist
  const deleteMutation = useMutation({
    mutationFn: watchlistAPI.deleteWatchlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
      if (activeWatchlistId) {
        const remaining = watchlists.filter(w => w.id !== activeWatchlistId);
        setActiveWatchlist(remaining.length > 0 ? remaining[0].id : null);
      }
    }
  });

  // Add symbol
  const addSymbolMutation = useMutation({
    mutationFn: ({ id, symbol }: { id: number; symbol: string }) =>
      watchlistAPI.addSymbolToWatchlist(id, symbol),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
    }
  });

  // Remove symbol
  const removeSymbolMutation = useMutation({
    mutationFn: ({ id, symbol }: { id: number; symbol: string }) =>
      watchlistAPI.removeSymbolFromWatchlist(id, symbol),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
    }
  });

  // Reorder watchlists
  const reorderMutation = useMutation({
    mutationFn: watchlistAPI.reorderWatchlists,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
    }
  });

  return {
    watchlists: data || watchlists,
    activeWatchlistId,
    isLoading,
    error,
    setActiveWatchlist,
    createWatchlist: createMutation.mutate,
    updateWatchlist: updateMutation.mutate,
    deleteWatchlist: deleteMutation.mutate,
    addSymbol: addSymbolMutation.mutate,
    removeSymbol: removeSymbolMutation.mutate,
    reorderWatchlists: reorderMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
};
