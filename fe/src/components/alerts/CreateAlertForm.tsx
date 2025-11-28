import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createAlert, CreateAlertRequest } from '../../api/alerts';
import { useWatchlistStore } from '../../store/watchlist';

interface CreateAlertFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const CreateAlertForm = ({ onSuccess, onCancel }: CreateAlertFormProps) => {
  const queryClient = useQueryClient();
  const watchlistSymbols = useWatchlistStore((state) => state.symbols);

  const [symbol, setSymbol] = useState('');
  const [condition, setCondition] = useState<CreateAlertRequest['condition']>('above');
  const [targetValue, setTargetValue] = useState('');
  const [notes, setNotes] = useState('');

  const createAlertMutation = useMutation({
    mutationFn: (data: CreateAlertRequest) => createAlert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      onSuccess();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !targetValue) {
      return;
    }

    createAlertMutation.mutate({
      symbol: symbol.toUpperCase(),
      condition,
      targetValue: parseFloat(targetValue),
      notes: notes.trim() || undefined
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-white/10 bg-slate-900/60 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Create Price Alert</h3>

      <div className="space-y-4">
        {/* Symbol */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Symbol</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="BTCUSDT"
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-500 focus:border-emerald-400 outline-none"
              required
              maxLength={20}
            />
            {watchlistSymbols.length > 0 && (
              <select
                onChange={(e) => setSymbol(e.target.value)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-emerald-400 outline-none"
              >
                <option value="">From watchlist</option>
                {watchlistSymbols.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Condition */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Alert When</label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as CreateAlertRequest['condition'])}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-emerald-400 outline-none"
            required
          >
            <option value="above">Price goes above</option>
            <option value="below">Price goes below</option>
            <option value="percent_change_up">Price increases by %</option>
            <option value="percent_change_down">Price decreases by %</option>
          </select>
        </div>

        {/* Target Value */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {condition === 'above' || condition === 'below' ? 'Target Price ($)' : 'Target Percentage (%)'}
          </label>
          <input
            type="number"
            step={condition.includes('percent') ? '0.1' : '0.01'}
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            placeholder={condition.includes('percent') ? '5.0' : '50000.00'}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-500 focus:border-emerald-400 outline-none"
            required
            min="0"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add a note to remember why you set this alert..."
            rows={2}
            maxLength={500}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-500 focus:border-emerald-400 outline-none resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createAlertMutation.isPending || !symbol || !targetValue}
            className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-400/30 hover:bg-emerald-300 transition disabled:opacity-50"
          >
            {createAlertMutation.isPending ? 'Creating...' : 'Create Alert'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default CreateAlertForm;

