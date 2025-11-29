/**
 * CreatePostForm - Enhanced
 * 
 * Features:
 * - Image upload with drag & drop
 * - Auto-detect hashtags
 * - Character counter
 * - Beautiful animations
 */

import { useState, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as postsAPI from '../../api/posts';
import { uploadImage, uploadBase64, Upload } from '../../api/uploads';
import { 
  PhotoIcon, 
  XMarkIcon, 
  HashtagIcon,
  AtSymbolIcon,
  FaceSmileIcon,
  ArrowUpTrayIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface CreatePostFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const CreatePostForm = ({ onSuccess, onCancel }: CreatePostFormProps) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: '',
    mentions: ''
  });
  const [uploadedImages, setUploadedImages] = useState<Upload[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showTagsInput, setShowTagsInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const createPostMutation = useMutation({
    mutationFn: postsAPI.createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setFormData({ title: '', content: '', tags: '', mentions: '' });
      setUploadedImages([]);
      onSuccess?.();
    }
  });

  // Auto-extract hashtags from content
  const extractHashtags = (text: string): string[] => {
    const matches = text.match(/#[\w\u0080-\uFFFF]+/g);
    return matches ? matches.map(tag => tag.slice(1)) : [];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.content.trim()) {
      return;
    }

    // Combine manual tags with auto-extracted hashtags
    const manualTags = formData.tags
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(t => t.length > 0);
    const autoTags = extractHashtags(formData.content);
    const allTags = [...new Set([...manualTags, ...autoTags])];

    const mentions = formData.mentions
      .split(',')
      .map(m => m.trim().replace(/^@/, ''))
      .filter(m => m.length > 0);

    createPostMutation.mutate({
      title: formData.title || undefined,
      content: formData.content,
      tags: allTags.length > 0 ? allTags : undefined,
      mentions: mentions.length > 0 ? mentions : undefined,
      imageIds: uploadedImages.map(img => img.id)
    });
  };

  // Handle file upload
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (fileArray.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of fileArray) {
        if (uploadedImages.length >= 10) break;
        const upload = await uploadImage(file, 'post');
        setUploadedImages(prev => [...prev, upload]);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  }, [uploadedImages.length]);

  // Handle paste
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          setIsUploading(true);
          try {
            const reader = new FileReader();
            reader.onload = async (event) => {
              const base64 = event.target?.result as string;
              const upload = await uploadBase64(base64, 'post');
              setUploadedImages(prev => [...prev, upload]);
              setIsUploading(false);
            };
            reader.readAsDataURL(file);
          } catch (error) {
            setIsUploading(false);
          }
        }
        break;
      }
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeImage = (id: number) => {
    setUploadedImages(prev => prev.filter(img => img.id !== id));
  };

  const insertHashtag = () => {
    if (contentRef.current) {
      const pos = contentRef.current.selectionStart;
      const text = formData.content;
      const newText = text.slice(0, pos) + '#' + text.slice(pos);
      setFormData({ ...formData, content: newText });
      setTimeout(() => {
        contentRef.current?.focus();
        contentRef.current?.setSelectionRange(pos + 1, pos + 1);
      }, 0);
    }
  };

  const insertMention = () => {
    if (contentRef.current) {
      const pos = contentRef.current.selectionStart;
      const text = formData.content;
      const newText = text.slice(0, pos) + '@' + text.slice(pos);
      setFormData({ ...formData, content: newText });
      setTimeout(() => {
        contentRef.current?.focus();
        contentRef.current?.setSelectionRange(pos + 1, pos + 1);
      }, 0);
    }
  };

  const detectedHashtags = extractHashtags(formData.content);
  const canSubmit = formData.content.trim().length > 0 && !createPostMutation.isPending && !isUploading;

  return (
    <form
      onSubmit={handleSubmit}
      onPaste={handlePaste}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative rounded-2xl border bg-gradient-to-b from-slate-900/90 to-slate-900/70 
        backdrop-blur-sm overflow-hidden transition-all duration-300
        ${isDragging 
          ? 'border-emerald-400 shadow-lg shadow-emerald-500/10' 
          : 'border-white/10 hover:border-white/20'
        }
      `}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-10 bg-emerald-500/10 backdrop-blur-sm 
                      flex items-center justify-center">
          <div className="text-center">
            <ArrowUpTrayIcon className="w-12 h-12 text-emerald-400 mx-auto mb-2 animate-bounce" />
            <p className="text-emerald-400 font-medium">Thả ảnh vào đây</p>
          </div>
        </div>
      )}

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 
                        flex items-center justify-center">
            <SparklesIcon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white">Tạo bài viết mới</h3>
            <p className="text-xs text-slate-500">Chia sẻ suy nghĩ của bạn với cộng đồng</p>
          </div>
        </div>

        {/* Title (optional) */}
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Tiêu đề (không bắt buộc)"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 
                   text-white placeholder:text-slate-500 focus:border-emerald-400/50 
                   focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
          maxLength={200}
        />

        {/* Content */}
        <div className="relative">
          <textarea
            ref={contentRef}
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="Bạn đang nghĩ gì? Dùng #hashtag để thêm chủ đề..."
            rows={5}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 
                     text-white placeholder:text-slate-500 focus:border-emerald-400/50 
                     focus:ring-2 focus:ring-emerald-400/20 outline-none resize-none 
                     transition-all leading-relaxed"
            maxLength={10000}
          />
          
          {/* Character counter */}
          <div className="absolute bottom-3 right-3 text-xs text-slate-500">
            {formData.content.length}/10000
          </div>
        </div>

        {/* Detected hashtags */}
        {detectedHashtags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">Hashtags:</span>
            {detectedHashtags.map((tag) => (
              <span 
                key={tag}
                className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/10 
                         text-emerald-400 border border-emerald-500/20"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Image previews */}
        {uploadedImages.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {uploadedImages.map((img) => (
              <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden group">
                <img 
                  src={img.thumbnailUrl || img.url} 
                  alt="" 
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(img.id)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white 
                           flex items-center justify-center opacity-0 group-hover:opacity-100 
                           transition-opacity hover:bg-rose-500"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
            
            {/* Upload more button */}
            {uploadedImages.length < 10 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-white/20 
                         hover:border-emerald-400/50 flex flex-col items-center justify-center 
                         gap-1 text-slate-400 hover:text-emerald-400 transition-colors"
              >
                <PhotoIcon className="w-6 h-6" />
                <span className="text-xs">Thêm</span>
              </button>
            )}
          </div>
        )}

        {/* Uploading indicator */}
        {isUploading && (
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 
                          rounded-full animate-spin" />
            <span>Đang tải ảnh...</span>
          </div>
        )}

        {/* Additional tags input */}
        {showTagsInput && (
          <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/10">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Tags thêm (phân cách bằng dấu phẩy)</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="bitcoin, trading, analysis"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 
                         text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/50 
                         outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Mentions</label>
              <input
                type="text"
                value={formData.mentions}
                onChange={(e) => setFormData({ ...formData, mentions: e.target.value })}
                placeholder="user1, user2"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 
                         text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/50 
                         outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between px-5 py-4 border-t border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-1">
          {/* Image upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl text-slate-400 hover:text-emerald-400 
                     hover:bg-emerald-400/10 transition-colors"
            title="Thêm ảnh (hoặc kéo thả, Ctrl+V)"
          >
            <PhotoIcon className="w-5 h-5" />
          </button>

          {/* Insert hashtag */}
          <button
            type="button"
            onClick={insertHashtag}
            className="p-2.5 rounded-xl text-slate-400 hover:text-emerald-400 
                     hover:bg-emerald-400/10 transition-colors"
            title="Thêm hashtag"
          >
            <HashtagIcon className="w-5 h-5" />
          </button>

          {/* Insert mention */}
          <button
            type="button"
            onClick={insertMention}
            className="p-2.5 rounded-xl text-slate-400 hover:text-blue-400 
                     hover:bg-blue-400/10 transition-colors"
            title="Thêm mention"
          >
            <AtSymbolIcon className="w-5 h-5" />
          </button>

          {/* Toggle more options */}
          <button
            type="button"
            onClick={() => setShowTagsInput(!showTagsInput)}
            className={`p-2.5 rounded-xl transition-colors ${
              showTagsInput 
                ? 'text-emerald-400 bg-emerald-400/10' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Thêm tùy chọn"
          >
            <FaceSmileIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white 
                       hover:bg-white/5 transition-colors"
            >
              Hủy
            </button>
          )}
          <button
            type="submit"
            disabled={!canSubmit}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 
                     text-sm font-semibold text-white shadow-lg shadow-emerald-500/25
                     hover:shadow-emerald-500/40 hover:scale-105 active:scale-100
                     transition-all disabled:opacity-50 disabled:cursor-not-allowed 
                     disabled:hover:scale-100 disabled:shadow-none"
          >
            {createPostMutation.isPending ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang đăng...
              </span>
            ) : (
              'Đăng bài'
            )}
          </button>
        </div>
      </div>

      {/* Error display */}
      {createPostMutation.isError && (
        <div className="px-5 py-3 bg-rose-500/10 border-t border-rose-500/20">
          <p className="text-sm text-rose-400">
            Có lỗi xảy ra. Vui lòng thử lại.
          </p>
        </div>
      )}
    </form>
  );
};

export default CreatePostForm;
