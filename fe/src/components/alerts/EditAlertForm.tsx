import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateAlert, Alert, UpdateAlertRequest } from '../../api/alerts';

interface EditAlertFormProps {
  alert: Alert;
  onSuccess: () => void;
  onCancel: () => void;
}

const EditAlertForm = ({ alert, onSuccess, onCancel }: EditAlertFormProps) => {
  const queryClient = useQueryClient();

  const [condition, setCondition] = useState<Alert['condition']>(alert.condition);
  const [targetValue, setTargetValue] = useState(alert.targetValue.toString());
  const [isActive, setIsActive] = useState(alert.isActive);
  const [notes, setNotes] = useState(alert.notes || '');

  const updateAlertMutation = useMutation({
    mutationFn: (data: UpdateAlertRequest) => updateAlert(alert.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      onSuccess();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetValue) {
      return;
    }

    updateAlertMutation.mutate({
      condition,
      targetValue: parseFloat(targetValue),
      isActive,
      notes: notes.trim() || undefined
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Condition */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Alert When</label>
        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value as Alert['condition'])}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-emerald-400 outline-none"
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
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-emerald-400 outline-none"
          required
          min="0"
        />
      </div>

      {/* Active Toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`active-${alert.id}`}
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="w-4 h-4 rounded border-white/10 bg-white/5 text-emerald-400 focus:ring-emerald-400"
        />
        <label htmlFor={`active-${alert.id}`} className="text-sm text-slate-300">
          Active
        </label>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
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
          disabled={updateAlertMutation.isPending || !targetValue}
          className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-400/30 hover:bg-emerald-300 transition disabled:opacity-50"
        >
          {updateAlertMutation.isPending ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
};

export default EditAlertForm;

