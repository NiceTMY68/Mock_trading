/**
 * BookmarkButton Component
 * 
 * Animated bookmark button with collection picker
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookmarkIcon as BookmarkOutline } from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolid } from '@heroicons/react/24/solid';
import { addBookmark, removeBookmark, checkBookmark, getCollections } from '../../api/bookmarks';
import { useAuthStore } from '../../store/auth';

interface BookmarkButtonProps {
  postId: number;
  className?: string;
  showCount?: boolean;
  count?: number;
  size?: 'sm' | 'md' | 'lg';
  onAuthRequired?: () => void;
}

const BookmarkButton = ({ 
  postId, 
  className = '', 
  showCount = false,
  count = 0,
  size = 'md',
  onAuthRequired
}: BookmarkButtonProps) => {
  const { isAuthenticated } = useAuthStore();
  const [showPicker, setShowPicker] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const queryClient = useQueryClient();

  const { data: isBookmarked = false } = useQuery({
    queryKey: ['bookmark', postId],
    queryFn: () => checkBookmark(postId),
    enabled: isAuthenticated,
  });

  const { data: collections = [] } = useQuery({
    queryKey: ['bookmark-collections'],
    queryFn: getCollections,
    enabled: showPicker && isAuthenticated,
  });

  const addMutation = useMutation({
    mutationFn: (collection: string) => addBookmark(postId, collection),
    onSuccess: () => {
      queryClient.setQueryData(['bookmark', postId], true);
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 600);
    }
  });

  const removeMutation = useMutation({
    mutationFn: () => removeBookmark(postId),
    onSuccess: () => {
      queryClient.setQueryData(['bookmark', postId], false);
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    }
  });

  const handleClick = () => {
    // Check auth first
    if (!isAuthenticated) {
      onAuthRequired?.();
      return;
    }

    if (isBookmarked) {
      removeMutation.mutate();
    } else {
      addMutation.mutate('default');
    }
    setShowPicker(false);
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Check auth first
    if (!isAuthenticated) {
      onAuthRequired?.();
      return;
    }

    if (!isBookmarked) {
      setShowPicker(!showPicker);
    }
  };

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const buttonSizes = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5'
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleClick}
        onContextMenu={handleRightClick}
        disabled={addMutation.isPending || removeMutation.isPending}
        className={`
          group flex items-center gap-1.5 rounded-xl transition-all duration-300
          ${buttonSizes[size]}
          ${isBookmarked 
            ? 'text-amber-400 hover:bg-amber-400/10' 
            : 'text-slate-400 hover:text-amber-400 hover:bg-white/5'
          }
          ${isAnimating ? 'scale-125' : ''}
          disabled:opacity-50
        `}
        title={isBookmarked ? 'Bỏ lưu' : 'Lưu bài viết (click phải để chọn bộ sưu tập)'}
      >
        {/* Icon with animation */}
        <span className={`relative ${isAnimating ? 'animate-bookmark-pop' : ''}`}>
          {isBookmarked ? (
            <BookmarkSolid className={sizeClasses[size]} />
          ) : (
            <BookmarkOutline className={`${sizeClasses[size]} group-hover:scale-110 transition-transform`} />
          )}
          
          {/* Sparkle effect on bookmark */}
          {isAnimating && (
            <>
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full animate-ping" />
              <span className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-amber-300 rounded-full animate-ping delay-100" />
            </>
          )}
        </span>

        {showCount && (
          <span className="text-sm font-medium">{count}</span>
        )}
      </button>

      {/* Collection Picker Dropdown */}
      {showPicker && isAuthenticated && (
        <>
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setShowPicker(false)}
          />
          <div className="absolute right-0 bottom-full mb-2 z-20 w-48 py-2 rounded-xl 
                        bg-slate-800 border border-white/10 shadow-xl animate-slide-up">
            <p className="px-3 py-1 text-xs text-slate-400 font-medium">Lưu vào bộ sưu tập</p>
            
            <button
              onClick={() => { addMutation.mutate('default'); setShowPicker(false); }}
              className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/5 transition-colors"
            >
              📑 Mặc định
            </button>
            
            {collections.map((col) => (
              <button
                key={col.collection}
                onClick={() => { addMutation.mutate(col.collection); setShowPicker(false); }}
                className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/5 transition-colors flex justify-between"
              >
                <span>📁 {col.collection}</span>
                <span className="text-slate-400">{col.count}</span>
              </button>
            ))}

            <div className="border-t border-white/10 mt-2 pt-2">
              <button
                onClick={() => {
                  const name = prompt('Tên bộ sưu tập mới:');
                  if (name) {
                    addMutation.mutate(name);
                    setShowPicker(false);
                  }
                }}
                className="w-full px-3 py-2 text-left text-sm text-emerald-400 hover:bg-white/5 transition-colors"
              >
                ➕ Tạo bộ sưu tập mới
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes bookmark-pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.4); }
          100% { transform: scale(1); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-bookmark-pop {
          animation: bookmark-pop 0.4s ease-out;
        }
        .animate-slide-up {
          animation: slide-up 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default BookmarkButton;
