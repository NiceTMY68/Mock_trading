import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth';
import { createReport, CreateReportRequest } from '../../api/reports';

interface ReportButtonProps {
  targetType: 'post' | 'comment' | 'user';
  targetId: number;
  onSuccess?: () => void;
}

const ReportButton = ({ targetType, targetId, onSuccess }: ReportButtonProps) => {
  const { isAuthenticated } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');
  const [selectedReason, setSelectedReason] = useState('');

  const reportMutation = useMutation({
    mutationFn: (data: CreateReportRequest) => createReport(data),
    onSuccess: () => {
      setShowModal(false);
      setReason('');
      setSelectedReason('');
      alert('Report submitted successfully. Thank you for your feedback.');
      onSuccess?.();
    },
    onError: (error: any) => {
      alert(error?.response?.data?.message || 'Failed to submit report');
    }
  });

  const reasons = [
    'Spam',
    'Harassment',
    'Inappropriate content',
    'Misinformation',
    'Other'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason && !reason.trim()) {
      alert('Please select or provide a reason');
      return;
    }
    reportMutation.mutate({
      targetType,
      targetId,
      reason: selectedReason || reason
    });
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-xs text-slate-400 hover:text-rose-400 transition"
      >
        Report
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl p-6">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-2xl font-bold text-white mb-4">Report {targetType}</h2>
            <p className="text-sm text-slate-400 mb-6">
              Help us understand what's wrong with this {targetType}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Reason</label>
                <div className="space-y-2">
                  {reasons.map((r) => (
                    <label key={r} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="reason"
                        value={r}
                        checked={selectedReason === r}
                        onChange={(e) => {
                          setSelectedReason(e.target.value);
                          setReason('');
                        }}
                        className="w-4 h-4 text-emerald-400 focus:ring-emerald-400"
                      />
                      <span className="text-sm text-white">{r}</span>
                    </label>
                  ))}
                </div>
              </div>

              {selectedReason === 'Other' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Additional details</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Please provide more details..."
                    rows={3}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reportMutation.isPending || (!selectedReason && !reason.trim())}
                  className="flex-1 rounded-lg bg-rose-400 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {reportMutation.isPending ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ReportButton;

