import { MarketOverview } from '../../types';
import { formatCurrency, formatNumber } from '../../utils/format';

interface OverviewCardsProps {
  data?: MarketOverview;
  isLoading?: boolean;
}

const skeleton =
  'animate-pulse rounded-2xl border border-white/5 bg-white/5 p-5 ring-1 ring-white/10 shadow-inner shadow-white/5';

const OverviewCards = ({ data, isLoading }: OverviewCardsProps) => {
  const cards = [
    {
      label: 'Active Symbols',
      value: data ? formatNumber(data.totalSymbols, { maximumFractionDigits: 0 }) : '--',
      change: '+18 new this week',
      accent: 'from-indigo-500/30 via-slate-900 to-slate-900'
    },
    {
      label: '24h Volume',
      value: data ? formatCurrency(data.totalVolume) : '--',
      change: 'USD quoted volume',
      accent: 'from-emerald-500/30 via-slate-900 to-slate-900'
    },
    {
      label: '24h Trades',
      value: data ? formatNumber(data.totalTrades, { maximumFractionDigits: 0 }) : '--',
      change: 'Binance spot executions',
      accent: 'from-cyan-500/30 via-slate-900 to-slate-900'
    }
  ];

  return (
    <section className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-3xl border border-white/5 bg-gradient-to-br ${card.accent} p-5 shadow-lg shadow-black/30`}
        >
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">{card.label}</p>
          {isLoading ? (
            <div className={`${skeleton} mt-4 h-10`} />
          ) : (
            <p className="mt-3 text-3xl font-semibold text-white">{card.value}</p>
          )}
          <p className="mt-1 text-xs text-slate-400">{card.change}</p>
        </div>
      ))}
    </section>
  );
};

export default OverviewCards;

