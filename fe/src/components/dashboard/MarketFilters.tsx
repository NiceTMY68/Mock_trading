import { useState } from 'react';

export interface MarketFilters {
  quote: string | null;
  minMarketCap: number | null;
  maxMarketCap: number | null;
  minVolume: number | null;
  maxVolume: number | null;
  minTradeCount: number | null;
  maxTradeCount: number | null;
}

interface MarketFiltersProps {
  quotes: string[];
  filters: MarketFilters;
  onFiltersChange: (filters: MarketFilters) => void;
}

const MarketFilters = ({ quotes, filters, onFiltersChange }: MarketFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = (key: keyof MarketFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      quote: null,
      minMarketCap: null,
      maxMarketCap: null,
      minVolume: null,
      maxVolume: null,
      minTradeCount: null,
      maxTradeCount: null
    });
  };

  const hasActiveFilters = 
    filters.quote !== null ||
    filters.minMarketCap !== null ||
    filters.maxMarketCap !== null ||
    filters.minVolume !== null ||
    filters.maxVolume !== null ||
    filters.minTradeCount !== null ||
    filters.maxTradeCount !== null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
          hasActiveFilters
            ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400'
            : 'border-white/10 bg-white/5 text-white hover:border-emerald-400 hover:bg-emerald-500/20'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Filters
        {hasActiveFilters && (
          <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-400 text-xs font-bold text-slate-900">
            {[
              filters.quote,
              filters.minMarketCap !== null,
              filters.maxMarketCap !== null,
              filters.minVolume !== null,
              filters.maxVolume !== null,
              filters.minTradeCount !== null,
              filters.maxTradeCount !== null
            ].filter(Boolean).length}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full right-0 mt-2 w-80 rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl z-20 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Advanced Filters</h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {/* Quote Asset */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Quote Asset</label>
                <select
                  value={filters.quote || ''}
                  onChange={(e) => updateFilter('quote', e.target.value || null)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
                >
                  <option value="">All quotes</option>
                  {quotes.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </div>

              {/* Market Cap Range */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Market Cap (USD)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={filters.minMarketCap || ''}
                    onChange={(e) => updateFilter('minMarketCap', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="Min"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
                  />
                  <input
                    type="number"
                    value={filters.maxMarketCap || ''}
                    onChange={(e) => updateFilter('maxMarketCap', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="Max"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Volume Range */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">24h Volume (USD)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={filters.minVolume || ''}
                    onChange={(e) => updateFilter('minVolume', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="Min"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
                  />
                  <input
                    type="number"
                    value={filters.maxVolume || ''}
                    onChange={(e) => updateFilter('maxVolume', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="Max"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Trade Count Range */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Trade Count (24h)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={filters.minTradeCount || ''}
                    onChange={(e) => updateFilter('minTradeCount', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Min"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
                  />
                  <input
                    type="number"
                    value={filters.maxTradeCount || ''}
                    onChange={(e) => updateFilter('maxTradeCount', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Max"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MarketFilters;

