import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth';
import { Comment } from '../../api/posts';
import * as postsAPI from '../../api/posts';
import { formatDistanceToNow } from 'date-fns';
import CreateCommentForm from './CreateCommentForm';
import PublicProfileView from '../profile/PublicProfileView';
import ReportButton from './ReportButton';
import { Linkify } from '../../utils/linkify';

interface CommentListProps {
  postId: number;
  comments: Comment[];
  onReply?: (commentId: number) => void;
}

const CommentItem = ({ comment, postId, onReply, depth = 0, allComments }: { 
  comment: Comment; 
  postId: number;
  onReply?: (commentId: number) => void;
  depth?: number;
  allComments: Comment[];
}) => {
  const { isAuthenticated, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showProfile, setShowProfile] = useState(false);
  
  // Filter replies for this comment
  const replies = allComments.filter(c => c.parentId === comment.id);

  const deleteCommentMutation = useMutation({
    mutationFn: () => postsAPI.deleteComment(comment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
    }
  });

  const updateCommentMutation = useMutation({
    mutationFn: () => postsAPI.updateComment(comment.id, editContent),
    onSuccess: () => {
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
    }
  });

  const isAuthor = isAuthenticated && user?.id === comment.userId;

  const handleDelete = () => {
    if (confirm('Delete this comment?')) {
      deleteCommentMutation.mutate();
    }
  };

  const handleSave = () => {
    if (editContent.trim()) {
      updateCommentMutation.mutate();
    }
  };

  return (
    <div className={`${depth > 0 ? 'ml-6 border-l-2 border-white/5 pl-4' : ''}`}>
      <div className="rounded-xl border border-white/5 bg-white/5 p-4 mb-3">
        {/* Comment Header */}
        <div className="flex items-start justify-between mb-2">
          <button
            onClick={() => comment.userId && setShowProfile(true)}
            className="flex items-center gap-2 hover:opacity-80 transition"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center">
              <span className="text-white font-semibold text-xs">
                {comment.authorName?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-white">{comment.authorName || 'Anonymous'}</p>
              <p className="text-xs text-slate-400">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </p>
            </div>
          </button>
          <div className="flex gap-2">
            {isAuthor && !isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-slate-400 hover:text-emerald-400"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="text-xs text-rose-400 hover:text-rose-300"
                >
                  Delete
                </button>
              </>
            )}
            {!isAuthor && isAuthenticated && comment.userId && (
              <ReportButton targetType="comment" targetId={comment.id} />
            )}
          </div>
        </div>

        {/* Comment Content */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 outline-none resize-none"
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setIsEditing(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateCommentMutation.isPending || !editContent.trim()}
                className="text-xs bg-emerald-400 px-3 py-1 rounded text-slate-900 font-medium hover:bg-emerald-300 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-300 whitespace-pre-wrap">
            <Linkify>{comment.content}</Linkify>
          </p>
        )}

        {/* Actions */}
        {!isEditing && isAuthenticated && depth < 2 && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <button
              onClick={() => {
                setShowReplyForm(!showReplyForm);
                onReply?.(comment.id);
              }}
              className="text-xs text-slate-400 hover:text-emerald-400 transition"
            >
              Reply
            </button>
          </div>
        )}
      </div>

      {/* Reply Form */}
      {showReplyForm && isAuthenticated && (
        <div className="mb-3">
          <CreateCommentForm
            postId={postId}
            parentId={comment.id}
            onSuccess={() => {
              setShowReplyForm(false);
            }}
          />
        </div>
      )}

      {/* Replies */}
      {replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              onReply={onReply}
              depth={depth + 1}
              allComments={allComments}
            />
          ))}
        </div>
      )}
      {showProfile && comment.userId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md">
            <PublicProfileView userId={comment.userId} onClose={() => setShowProfile(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

const CommentList = ({ postId, comments, onReply }: CommentListProps) => {
  // Filter top-level comments (no parent) and sort by created_at
  const topLevelComments = comments
    .filter(c => !c.parentId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (topLevelComments.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <p>No comments yet. Be the first to comment!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {topLevelComments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          postId={postId}
          onReply={onReply}
          allComments={comments}
        />
      ))}
    </div>
  );
};

export default CommentList;

