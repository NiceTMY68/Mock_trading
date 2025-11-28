import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth';
import { formatCurrency, formatPercent, humanizeSymbol } from '../../utils/format';
import * as portfolioAPI from '../../api/portfolio';
import { useRealtimePrices } from '../../hooks/useRealtimePrices';

const PortfolioPanel = () => {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ symbol: '', quantity: '', avgPrice: '', notes: '' });

  // Fetch portfolio
  const { data: portfolio, isLoading } = useQuery({
    queryKey: ['portfolio'],
    queryFn: portfolioAPI.getPortfolio,
    enabled: isAuthenticated
  });

  // Get symbols for realtime prices
  const symbols = portfolio?.holdings?.map(h => h.symbol) || [];
  const { prices: realtimePrices } = useRealtimePrices(symbols);

  // Add holding mutation
  const addHoldingMutation = useMutation({
    mutationFn: portfolioAPI.addHolding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      setShowAddForm(false);
      setFormData({ symbol: '', quantity: '', avgPrice: '', notes: '' });
    }
  });

  // Remove holding mutation
  const removeHoldingMutation = useMutation({
    mutationFn: portfolioAPI.removeHolding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    }
  });

  const handleAdd = () => {
    if (!formData.symbol || !formData.quantity || !formData.avgPrice) {
      alert('Please fill in symbol, quantity, and average price');
      return;
    }

    addHoldingMutation.mutate({
      symbol: formData.symbol.toUpperCase(),
      quantity: parseFloat(formData.quantity),
      avgPrice: parseFloat(formData.avgPrice),
      notes: formData.notes || undefined
    });
  };

  const handleRemove = (symbol: string) => {
    if (confirm(`Remove ${symbol} from portfolio?`)) {
      removeHoldingMutation.mutate(symbol);
    }
  };

  if (!isAuthenticated) {
    return (
      <section className="rounded-3xl border border-white/5 bg-slate-900/60 p-5 shadow-2xl shadow-black/50">
        <div className="text-center py-8">
          <p className="text-slate-400 mb-2">Portfolio tracking requires authentication</p>
          <a href="/login" className="text-emerald-400 hover:text-emerald-300 underline">
            Login to track your portfolio
          </a>
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="rounded-3xl border border-white/5 bg-slate-900/60 p-5 shadow-2xl shadow-black/50">
        <div className="text-center py-8">
          <div className="text-slate-400">Loading portfolio...</div>
        </div>
      </section>
    );
  }

  const holdings = portfolio?.holdings || [];
  const totalValue = portfolio?.totalValueUsd || 0;
  const totalCostBasis = portfolio?.totalCostBasis || 0;
  const totalPnl = portfolio?.totalPnl || 0;
  const totalPnlPercent = portfolio?.totalPnlPercent || 0;

  // Merge realtime prices with holdings
  const holdingsWithRealtime = holdings.map(holding => {
    const realtime = realtimePrices[holding.symbol];
    if (realtime) {
      const currentPrice = realtime.price;
      const quantity = holding.quantity;
      const avgPrice = holding.avgPrice;
      const currentValue = quantity * currentPrice;
      const costBasis = quantity * avgPrice;
      const pnl = currentValue - costBasis;
      const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

      return {
        ...holding,
        currentPrice,
        currentValue,
        costBasis,
        pnl,
        pnlPercent
      };
    }
    return holding;
  });

  return (
    <section className="rounded-3xl border border-white/5 bg-slate-900/60 p-5 shadow-2xl shadow-black/50">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Portfolio</p>
          <h3 className="text-xl font-semibold text-white">My Holdings</h3>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:border-emerald-400 transition"
        >
          {showAddForm ? 'Cancel' : '+ Add Holding'}
        </button>
      </div>

      {/* Add Holding Form */}
      {showAddForm && (
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input
              type="text"
              placeholder="Symbol (e.g. BTCUSDT)"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 outline-none"
            />
            <input
              type="number"
              placeholder="Quantity"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 outline-none"
            />
            <input
              type="number"
              placeholder="Average Price (USD)"
              value={formData.avgPrice}
              onChange={(e) => setFormData({ ...formData, avgPrice: e.target.value })}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 outline-none"
            />
            <input
              type="text"
              placeholder="Notes (optional)"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 outline-none"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={addHoldingMutation.isPending}
            className="w-full rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-400/30 hover:bg-emerald-300 transition disabled:opacity-50"
          >
            {addHoldingMutation.isPending ? 'Adding...' : 'Add Holding'}
          </button>
        </div>
      )}

      {/* Portfolio Summary */}
      <div className="mb-4 grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div>
          <p className="text-xs text-slate-400 mb-1">Total Value</p>
          <p className="text-lg font-semibold text-white">{formatCurrency(totalValue)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1">Total P&L</p>
          <p className={`text-lg font-semibold ${totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(totalPnl)} ({formatPercent(totalPnlPercent)})
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1">Cost Basis</p>
          <p className="text-sm font-medium text-slate-300">{formatCurrency(totalCostBasis)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1">Holdings</p>
          <p className="text-sm font-medium text-slate-300">{holdings.length} assets</p>
        </div>
      </div>

      {/* Holdings List */}
      <div className="space-y-2">
        {holdingsWithRealtime.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>No holdings yet. Add your first holding to start tracking!</p>
          </div>
        ) : (
          holdingsWithRealtime.map((holding) => (
            <div
              key={holding.symbol}
              className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-4 hover:border-emerald-300/40 transition"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-white">{humanizeSymbol(holding.symbol)}</p>
                  <span className="text-xs text-slate-400">
                    {holding.quantity} @ {formatCurrency(holding.avgPrice)}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span>Value: {formatCurrency(holding.currentValue || 0)}</span>
                  <span>Cost: {formatCurrency(holding.costBasis || 0)}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className={`text-sm font-semibold ${(holding.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(holding.pnl || 0)}
                  </p>
                  <p className={`text-xs ${(holding.pnlPercent || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatPercent(holding.pnlPercent || 0)}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(holding.symbol)}
                  className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 hover:border-rose-300 hover:text-rose-200 transition"
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default PortfolioPanel;

