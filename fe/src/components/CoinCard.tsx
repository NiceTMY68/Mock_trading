import React from 'react';
import { CoinData } from '../types';
import CandlestickChart from './CandlestickChart';

interface CoinCardProps {
  coin: CoinData;
}

const CoinCard: React.FC<CoinCardProps> = ({ coin }) => {
  const isPositive = coin.change24h >= 0;
  
  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return price.toFixed(2);
  };

  const formatMarketCap = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value}`;
  };

  return (
    <div className="glass-card rounded-soft-lg p-4 hover:shadow-md transition-all">
      {/* Coin Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xs">{coin.symbol[0]}</span>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-text-dark">{coin.symbol}</h4>
            <p className="text-xs text-gray-500">{coin.name}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold text-sm text-text-dark">${formatPrice(coin.price)}</p>
          <p className={`text-xs font-medium ${isPositive ? 'text-success' : 'text-danger'}`}>
            {isPositive ? '↑' : '↓'} {Math.abs(coin.change24h).toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-24 mb-3">
        <CandlestickChart data={coin.chartData} symbol={coin.symbol} />
      </div>

      {/* Stats */}
      <div className="flex justify-between text-xs text-gray-600 pt-2 border-t border-gray-100">
        <div>
          <p className="text-gray-500">Market Cap</p>
          <p className="font-medium text-text-dark">{formatMarketCap(coin.marketCap)}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-500">Volume 24h</p>
          <p className="font-medium text-text-dark">{formatMarketCap(coin.volume24h)}</p>
        </div>
      </div>
    </div>
  );
};

export default CoinCard;

