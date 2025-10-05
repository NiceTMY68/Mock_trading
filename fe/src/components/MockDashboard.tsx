import React, { useEffect, useState } from 'react';
import { CoinData } from '../types';
import { fetchTopCoins } from '../api/market';
import CoinCard from './CoinCard';

const MockDashboard: React.FC = () => {
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCoins = async () => {
      try {
        const data = await fetchTopCoins();
        setCoins(data.topCoins.slice(0, 4));
      } catch (error) {
        console.error('Failed to load coins:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCoins();
  }, []);

  if (loading) {
    return (
      <div className="glass-card rounded-soft-lg p-8 w-full max-w-2xl animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-soft-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-soft-lg p-6 md:p-8 w-full max-w-2xl shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl md:text-2xl font-bold text-text-dark">Top Market Movers</h3>
          <p className="text-sm text-gray-500 mt-1">Live data from Binance</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-600">Live</span>
        </div>
      </div>

      {/* Coins Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {coins.map((coin) => (
          <CoinCard key={coin.symbol} coin={coin} />
        ))}
      </div>

      {/* Quick Trade Button */}
      <button className="w-full py-3 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-soft-lg hover:shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]">
        Start Trading Now →
      </button>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">24h Volume</p>
          <p className="text-sm font-bold text-text-dark">$127.5B</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Active Users</p>
          <p className="text-sm font-bold text-primary">12.4K+</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Total Trades</p>
          <p className="text-sm font-bold text-accent">2.8M+</p>
        </div>
      </div>
    </div>
  );
};

export default MockDashboard;

