import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAlerts, deleteAlert, updateAlert, Alert } from '../../api/alerts';
import { formatDistanceToNow } from 'date-fns';
import CreateAlertForm from './CreateAlertForm';
import EditAlertForm from './EditAlertForm';

const AlertList = () => {
  const queryClient = useQueryClient();
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => getAlerts(false) // Only active alerts
  });

  const deleteAlertMutation = useMutation({
    mutationFn: deleteAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    }
  });

  const toggleAlertMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      updateAlert(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    }
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

  const getConditionSymbol = (condition: Alert['condition']) => {
    switch (condition) {
      case 'above':
        return '≥';
      case 'below':
        return '≤';
      case 'percent_change_up':
        return '+';
      case 'percent_change_down':
        return '-';
      default:
        return '';
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
            <div key={i} className="h-20 bg-white/10 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Price Alerts</h2>
          <p className="text-sm text-slate-400 mt-1">Get notified when prices hit your targets</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-400/30 hover:bg-emerald-300 transition"
        >
          {showCreateForm ? 'Cancel' : '+ Create Alert'}
        </button>
      </div>

      {showCreateForm && (
        <CreateAlertForm
          onSuccess={() => {
            setShowCreateForm(false);
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {alerts.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-12 text-center">
          <p className="text-slate-400 mb-4">No active alerts</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="text-emerald-400 hover:text-emerald-300 underline"
          >
            Create your first alert
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="rounded-xl border border-white/5 bg-slate-900/60 p-4 hover:border-emerald-300/40 transition"
            >
              {editingAlert?.id === alert.id ? (
                <EditAlertForm
                  alert={alert}
                  onSuccess={() => {
                    setEditingAlert(null);
                    queryClient.invalidateQueries({ queryKey: ['alerts'] });
                  }}
                  onCancel={() => setEditingAlert(null)}
                />
              ) : (
                <>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg font-semibold text-white">{alert.symbol}</span>
                        <span className="text-sm text-slate-400">
                          {getConditionLabel(alert.condition)} {getConditionSymbol(alert.condition)}{' '}
                          {formatTargetValue(alert.condition, alert.targetValue)}
                        </span>
                        {alert.isActive ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/30">
                            Inactive
                          </span>
                        )}
                      </div>
                      {alert.notes && (
                        <p className="text-sm text-slate-400">{alert.notes}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-2">
                        Created {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingAlert(alert)}
                        className="text-xs text-slate-400 hover:text-emerald-400"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() =>
                          toggleAlertMutation.mutate({ id: alert.id, isActive: !alert.isActive })
                        }
                        className="text-xs text-slate-400 hover:text-emerald-400"
                      >
                        {alert.isActive ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this alert?')) {
                            deleteAlertMutation.mutate(alert.id);
                          }
                        }}
                        className="text-xs text-rose-400 hover:text-rose-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertList;

