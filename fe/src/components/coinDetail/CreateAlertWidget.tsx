import { useState } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth';
import { createAlert, CreateAlertRequest } from '../../api/alerts';

interface CreateAlertWidgetProps {
  symbol: string;
  currentPrice: number;
}

const CreateAlertWidget = ({ symbol, currentPrice }: CreateAlertWidgetProps) => {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    condition: 'above' as 'above' | 'below' | 'percent_change_up' | 'percent_change_down',
    targetPrice: currentPrice.toString(),
    percentChange: '5'
  });

  const createAlertMutation = useMutation({
    mutationFn: (data: CreateAlertRequest) => createAlert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      setShowForm(false);
      setFormData({
        condition: 'above',
        targetPrice: currentPrice.toString(),
        percentChange: '5'
      });
      alert('Alert created successfully!');
    },
    onError: (error: any) => {
      alert(error?.response?.data?.message || 'Failed to create alert');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let alertData: CreateAlertRequest;
    
    if (formData.condition === 'percent_change_up' || formData.condition === 'percent_change_down') {
      alertData = {
        symbol,
        condition: formData.condition,
        targetValue: parseFloat(formData.percentChange)
      };
    } else {
      alertData = {
        symbol,
        condition: formData.condition,
        targetValue: parseFloat(formData.targetPrice)
      };
    }

    createAlertMutation.mutate(alertData);
  };

  if (!isAuthenticated) {
    return null;
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-400/20 transition"
      >
        <BellIcon className="w-4 h-4 inline mr-1" /> Create Alert
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Create Price Alert</h3>
        <button
          onClick={() => setShowForm(false)}
          className="text-slate-400 hover:text-white"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Alert Condition</label>
          <select
            value={formData.condition}
            onChange={(e) => setFormData({ ...formData, condition: e.target.value as any })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
          >
            <option value="above">Price goes above</option>
            <option value="below">Price goes below</option>
            <option value="percent_change_up">Price increases by %</option>
            <option value="percent_change_down">Price decreases by %</option>
          </select>
        </div>

        {(formData.condition === 'percent_change_up' || formData.condition === 'percent_change_down') ? (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Percent Change (%)</label>
            <input
              type="number"
              step="0.1"
              value={formData.percentChange}
              onChange={(e) => setFormData({ ...formData, percentChange: e.target.value })}
              placeholder="5"
              required
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Target Price (Current: ${currentPrice.toLocaleString()})
            </label>
            <input
              type="number"
              step="0.000001"
              value={formData.targetPrice}
              onChange={(e) => setFormData({ ...formData, targetPrice: e.target.value })}
              placeholder={currentPrice.toString()}
              required
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
            />
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createAlertMutation.isPending}
            className="flex-1 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-300 transition disabled:opacity-50"
          >
            {createAlertMutation.isPending ? 'Creating...' : 'Create Alert'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateAlertWidget;

