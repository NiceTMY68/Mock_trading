export const formatCurrency = (value: number | string | undefined | null, options: Intl.NumberFormatOptions = {}) => {
  if (value === undefined || value === null) {
    return '--';
  }
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num) || !Number.isFinite(num)) {
    return '--';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
    ...options
  }).format(num);
};

export const formatNumber = (value: number | string | undefined | null, options: Intl.NumberFormatOptions = {}) => {
  if (value === undefined || value === null) {
    return '--';
  }
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num) || !Number.isFinite(num)) {
    return '--';
  }
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
    ...options
  }).format(num);
};

export const formatPercent = (value: number | string | undefined | null, fractionDigits = 2) => {
  if (value === undefined || value === null) {
    return '--';
  }
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num) || !Number.isFinite(num)) {
    return '--';
  }
  return `${num > 0 ? '+' : ''}${num.toFixed(fractionDigits)}%`;
};

export const getChangeColor = (value?: number) => {
  if (value === undefined || value === null) {
    return 'text-slate-400';
  }
  if (value > 0) {
    return 'text-emerald-400';
  }
  if (value < 0) {
    return 'text-rose-400';
  }
  return 'text-slate-400';
};

export const humanizeSymbol = (symbol: string) => {
  if (!symbol) return '';
  if (symbol.includes('/')) return symbol;
  const len = symbol.length;
  if (len <= 3) return symbol;
  const commonQuotes = ['USDT', 'USDC', 'BUSD', 'BTC', 'ETH'];
  for (const quote of commonQuotes) {
    if (symbol.endsWith(quote)) {
      const base = symbol.slice(0, -quote.length);
      return `${base}/${quote}`;
    }
  }
  return symbol;
};

