/**
 * BlockUserButton Component
 * 
 * Button để block/unblock user với confirmation
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  NoSymbolIcon, 
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';
import { blockUser, unblockUser, checkBlockStatus } from '../../api/blocks';

interface BlockUserButtonProps {
  userId: number;
  userName: string;
  className?: string;
  variant?: 'button' | 'menuItem';
  onBlocked?: () => void;
}

const BlockUserButton = ({ 
  userId, 
  userName,
  className = '',
  variant = 'button',
  onBlocked
}: BlockUserButtonProps) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();

  const { data: blockStatus } = useQuery({
    queryKey: ['block-status', userId],
    queryFn: () => checkBlockStatus(userId),
  });

  const blockMutation = useMutation({
    mutationFn: (reasonArg?: string) => blockUser(userId, reasonArg),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['block-status', userId] });
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      setShowConfirm(false);
      onBlocked?.();
    }
  });

  const unblockMutation = useMutation({
    mutationFn: () => unblockUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['block-status', userId] });
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
    }
  });

  const isBlocked = blockStatus?.isBlocked;

  const handleClick = () => {
    if (isBlocked) {
      unblockMutation.mutate();
    } else {
      setShowConfirm(true);
    }
  };

  // Define ConfirmModal before it's used
  const ConfirmModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setShowConfirm(false)}
      />
      
      <div className="relative bg-slate-900 border border-white/10 rounded-2xl 
                    w-full max-w-md p-6 shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center">
            <ShieldExclamationIcon className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Chặn {userName}?</h3>
            <p className="text-sm text-slate-400">Hành động này có thể hoàn tác</p>
          </div>
          <button
            onClick={() => setShowConfirm(false)}
            className="ml-auto p-2 rounded-lg hover:bg-white/5 text-slate-400"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 
                      border border-amber-500/20 mb-4">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-200/80">
            <p className="font-medium text-amber-300 mb-1">Khi bạn chặn ai đó:</p>
            <ul className="space-y-1 list-disc list-inside text-amber-200/70">
              <li>Họ không thể xem bài viết của bạn</li>
              <li>Họ không thể tương tác với bạn</li>
              <li>Bạn sẽ không thấy nội dung của họ</li>
            </ul>
          </div>
        </div>

        {/* Reason (optional) */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Lý do (không bắt buộc)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Nhập lý do chặn..."
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                     text-white placeholder-slate-500 focus:border-rose-500/50 
                     focus:ring-2 focus:ring-rose-500/20 resize-none"
            rows={2}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowConfirm(false)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-white 
                     hover:bg-white/10 transition-colors font-medium"
          >
            Hủy
          </button>
          <button
            onClick={() => blockMutation.mutate(reason || undefined)}
            disabled={blockMutation.isPending}
            className="flex-1 px-4 py-2.5 rounded-xl bg-rose-500 text-white 
                     hover:bg-rose-600 transition-colors font-medium
                     disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2"
          >
            {blockMutation.isPending ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <NoSymbolIcon className="w-5 h-5" />
                Chặn
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );

  if (variant === 'menuItem') {
    return (
      <>
        <button
          onClick={handleClick}
          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
            isBlocked 
              ? 'text-slate-400 hover:bg-white/5' 
              : 'text-rose-400 hover:bg-rose-500/10'
          } ${className}`}
        >
          <NoSymbolIcon className="w-5 h-5" />
          <span className="text-sm font-medium">
            {isBlocked ? 'Bỏ chặn người dùng' : 'Chặn người dùng'}
          </span>
        </button>

        {/* Confirmation Modal */}
        {showConfirm && <ConfirmModal />}
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={blockMutation.isPending || unblockMutation.isPending}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-medium text-sm
          ${isBlocked 
            ? 'bg-white/5 text-slate-300 hover:bg-white/10' 
            : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20'
          }
          disabled:opacity-50
          ${className}
        `}
      >
        <NoSymbolIcon className="w-4 h-4" />
        {isBlocked ? 'Bỏ chặn' : 'Chặn'}
      </button>

      {showConfirm && <ConfirmModal />}
    </>
  );
};

export default BlockUserButton;
