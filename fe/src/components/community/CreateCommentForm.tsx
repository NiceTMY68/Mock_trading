import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth';
import * as postsAPI from '../../api/posts';
import LoginModal from '../auth/LoginModal';

interface CreateCommentFormProps {
  postId: number;
  parentId?: number | null;
  onSuccess?: () => void;
}

const CreateCommentForm = ({ postId, parentId, onSuccess }: CreateCommentFormProps) => {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);

  const createCommentMutation = useMutation({
    mutationFn: (data: postsAPI.CreateCommentRequest) => postsAPI.createComment(postId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setContent('');
      onSuccess?.();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      return;
    }

    createCommentMutation.mutate({
      content: content.trim(),
      parentId: parentId || undefined
    });
  };

  if (!isAuthenticated) {
    return (
      <>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
          <p className="text-sm text-slate-400 mb-2">Đăng nhập để bình luận</p>
          <button
            onClick={() => setShowLoginModal(true)}
            className="text-emerald-400 hover:text-emerald-300 underline text-sm"
          >
            Đăng nhập / Đăng ký
          </button>
        </div>
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
        />
      </>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-white/10 bg-white/5 p-4">
      {parentId && (
        <p className="text-xs text-slate-400 mb-2">Replying to comment...</p>
      )}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={parentId ? "Write a reply..." : "Write a comment..."}
        rows={3}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 outline-none resize-none mb-3"
        maxLength={2000}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{content.length}/2000 characters</p>
        <div className="flex gap-2">
          {parentId && (
            <button
              type="button"
              onClick={onSuccess}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={createCommentMutation.isPending || !content.trim()}
            className="rounded-lg bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-900 shadow-lg shadow-emerald-400/30 hover:bg-emerald-300 transition disabled:opacity-50"
          >
            {createCommentMutation.isPending ? 'Posting...' : parentId ? 'Reply' : 'Comment'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default CreateCommentForm;

