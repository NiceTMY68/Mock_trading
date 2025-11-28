import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as postsAPI from '../../api/posts';

interface CreatePostFormProps {
  onSuccess?: () => void;
}

const CreatePostForm = ({ onSuccess }: CreatePostFormProps) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: '',
    mentions: ''
  });

  const createPostMutation = useMutation({
    mutationFn: postsAPI.createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setFormData({ title: '', content: '', tags: '', mentions: '' });
      onSuccess?.();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('Please fill in title and content');
      return;
    }

    const tags = formData.tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
    const mentions = formData.mentions
      .split(',')
      .map(m => m.trim())
      .filter(m => m.length > 0);

    createPostMutation.mutate({
      title: formData.title,
      content: formData.content,
      tags: tags.length > 0 ? tags : undefined,
      mentions: mentions.length > 0 ? mentions : undefined
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 space-y-4"
    >
      <h3 className="text-lg font-semibold text-white mb-4">Create New Post</h3>

      <div>
        <label className="block text-sm text-slate-400 mb-2">Title</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter post title..."
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-slate-500 focus:border-emerald-400 outline-none"
          maxLength={200}
        />
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-2">Content</label>
        <textarea
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          placeholder="Share your thoughts..."
          rows={6}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-slate-500 focus:border-emerald-400 outline-none resize-none"
          maxLength={10000}
        />
        <p className="text-xs text-slate-500 mt-1">
          {formData.content.length}/10000 characters
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-400 mb-2">Tags (comma-separated)</label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="bitcoin, trading, analysis"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-2">Mentions (comma-separated)</label>
          <input
            type="text"
            value={formData.mentions}
            onChange={(e) => setFormData({ ...formData, mentions: e.target.value })}
            placeholder="@user1, @user2"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 outline-none"
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onSuccess}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white hover:border-white/20 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={createPostMutation.isPending || !formData.title.trim() || !formData.content.trim()}
          className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-400/30 hover:bg-emerald-300 transition disabled:opacity-50"
        >
          {createPostMutation.isPending ? 'Publishing...' : 'Publish Post'}
        </button>
      </div>
    </form>
  );
};

export default CreatePostForm;

