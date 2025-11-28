import { useQuery } from '@tanstack/react-query';
import { getAlertHistory, Alert } from '../../api/alerts';
import { formatDistanceToNow } from 'date-fns';

const AlertHistory = () => {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['alerts', 'history'],
    queryFn: () => getAlertHistory(50)
  });

  const getConditionLabel = (condition: Alert['condition']) => {
    switch (condition) {
      case 'above':
        return 'Price above';
      case 'below':
        return 'Price below';
      case 'percent_change_up':
        return 'Increase by';
      case 'percent_change_down':
        return 'Decrease by';
      default:
        return condition;
    }
  };

  const formatTargetValue = (condition: Alert['condition'], value: number) => {
    if (condition === 'percent_change_up' || condition === 'percent_change_down') {
      return `${value}%`;
    }
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-6 animate-pulse">
        <div className="h-6 bg-white/10 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-white/10 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-12 text-center">
        <p className="text-slate-400">No triggered alerts yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">Alert History</h2>
        <p className="text-sm text-slate-400 mt-1">Previously triggered alerts</p>
      </div>

      <div className="space-y-3">
        {history.map((alert) => (
          <div
            key={alert.id}
            className="rounded-xl border border-white/5 bg-slate-900/60 p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-lg font-semibold text-white">{alert.symbol}</span>
                  <span className="text-sm text-slate-400">
                    {getConditionLabel(alert.condition)} {formatTargetValue(alert.condition, alert.targetValue)}
                  </span>
                  <span className="px-2 py-1 text-xs rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                    Triggered
                  </span>
                </div>
                {alert.triggeredPrice && (
                  <p className="text-sm text-emerald-300 mb-1">
                    Triggered at ${alert.triggeredPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                )}
                {alert.notes && (
                  <p className="text-sm text-slate-400 mb-2">{alert.notes}</p>
                )}
                <p className="text-xs text-slate-500">
                  Triggered {formatDistanceToNow(new Date(alert.triggeredAt!), { addSuffix: true })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlertHistory;

