
import { useState, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { uploadImage, uploadBase64, Upload } from '../../api/uploads';
import { PhotoIcon, XMarkIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

interface ImageUploadProps {
  onUpload: (uploads: Upload[]) => void;
  maxFiles?: number;
  existingImages?: Upload[];
  onRemove?: (id: number) => void;
  className?: string;
}

const ImageUpload = ({ 
  onUpload, 
  maxFiles = 10, 
  existingImages = [],
  onRemove,
  className = '' 
}: ImageUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previews, setPreviews] = useState<Array<{ id?: number; url: string; file?: File; uploading?: boolean }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      return uploadImage(file, 'post');
    },
    onSuccess: (upload) => {
      onUpload([...existingImages, upload]);
    }
  });

  const pasteUploadMutation = useMutation({
    mutationFn: async (base64: string) => {
      return uploadBase64(base64, 'post');
    },
    onSuccess: (upload) => {
      onUpload([...existingImages, upload]);
    }
  });

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const remainingSlots = maxFiles - existingImages.length - previews.length;
    const filesToUpload = fileArray.slice(0, remainingSlots);

    for (const file of filesToUpload) {
      if (!file.type.startsWith('image/')) continue;

      // Add preview immediately
      const previewUrl = URL.createObjectURL(file);
      setPreviews(prev => [...prev, { url: previewUrl, file, uploading: true }]);

      try {
        const upload = await uploadMutation.mutateAsync(file);
        
        // Replace preview with uploaded image
        setPreviews(prev => prev.filter(p => p.url !== previewUrl));
        URL.revokeObjectURL(previewUrl);
      } catch (error) {
        // Remove failed preview
        setPreviews(prev => prev.filter(p => p.url !== previewUrl));
        URL.revokeObjectURL(previewUrl);
      }
    }
  }, [maxFiles, existingImages.length, previews.length, uploadMutation]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            
            // Add preview
            setPreviews(prev => [...prev, { url: base64, uploading: true }]);
            
            try {
              const upload = await pasteUploadMutation.mutateAsync(base64);
              setPreviews(prev => prev.filter(p => p.url !== base64));
            } catch (error) {
              setPreviews(prev => prev.filter(p => p.url !== base64));
            }
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  }, [pasteUploadMutation]);

  const handleRemoveExisting = (id: number) => {
    onRemove?.(id);
  };

  const handleRemovePreview = (url: string) => {
    setPreviews(prev => prev.filter(p => p.url !== url));
    URL.revokeObjectURL(url);
  };

  const totalImages = existingImages.length + previews.length;
  const canAddMore = totalImages < maxFiles;

  return (
    <div className={`space-y-4 ${className}`} onPaste={handlePaste}>
      {/* Upload Zone */}
      {canAddMore && (
        <div
          className={`
            relative border-2 border-dashed rounded-2xl p-8
            transition-all duration-300 cursor-pointer
            ${isDragging 
              ? 'border-emerald-400 bg-emerald-400/10 scale-[1.02]' 
              : 'border-white/20 hover:border-emerald-400/50 hover:bg-white/5'
            }
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          
          <div className="flex flex-col items-center gap-3 text-center">
            <div className={`
              w-16 h-16 rounded-full flex items-center justify-center
              transition-all duration-300
              ${isDragging ? 'bg-emerald-400/20 scale-110' : 'bg-white/10'}
            `}>
              {isDragging ? (
                <ArrowUpTrayIcon className="w-8 h-8 text-emerald-400 animate-bounce" />
              ) : (
                <PhotoIcon className="w-8 h-8 text-slate-400" />
              )}
            </div>
            
            <div>
              <p className="text-sm font-medium text-white">
                {isDragging ? 'Drop image here' : 'Drag & drop image or click to select'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Supports JPEG, PNG, GIF, WebP • Max 10MB
              </p>
              <p className="text-xs text-emerald-400/70 mt-2">
                💡 Tip: Ctrl+V to paste image from clipboard
              </p>
            </div>
          </div>

          {/* Animated border on drag */}
          {isDragging && (
            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
              <div className="absolute inset-0 border-2 border-emerald-400 rounded-2xl animate-pulse" />
            </div>
          )}
        </div>
      )}

      {/* Image Previews */}
      {(existingImages.length > 0 || previews.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {/* Existing uploaded images */}
          {existingImages.map((img) => (
            <div 
              key={img.id} 
              className="relative aspect-square rounded-xl overflow-hidden group"
            >
              <img
                src={img.thumbnailUrl || img.url}
                alt=""
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <button
                onClick={() => handleRemoveExisting(img.id)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-rose-500/90 text-white 
                         flex items-center justify-center opacity-0 group-hover:opacity-100 
                         transition-all hover:bg-rose-600 hover:scale-110"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs text-white/80 truncate">
                  {img.originalName || img.filename}
                </p>
              </div>
            </div>
          ))}

          {/* Uploading previews */}
          {previews.map((preview, index) => (
            <div 
              key={preview.url} 
              className="relative aspect-square rounded-xl overflow-hidden"
            >
              <img
                src={preview.url}
                alt=""
                className="w-full h-full object-cover"
              />
              
              {preview.uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="relative">
                    <div className="w-10 h-10 border-3 border-white/30 border-t-emerald-400 rounded-full animate-spin" />
                    <ArrowUpTrayIcon className="w-4 h-4 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                </div>
              )}

              {!preview.uploading && (
                <button
                  onClick={() => handleRemovePreview(preview.url)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-rose-500/90 text-white 
                           flex items-center justify-center hover:bg-rose-600"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}

          {/* Add more placeholder */}
          {canAddMore && totalImages > 0 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-white/20 
                       hover:border-emerald-400/50 hover:bg-white/5 transition-all
                       flex flex-col items-center justify-center gap-2"
            >
              <PhotoIcon className="w-8 h-8 text-slate-400" />
              <span className="text-xs text-slate-400">Add image</span>
            </button>
          )}
        </div>
      )}

      {/* Image count */}
      {totalImages > 0 && (
        <p className="text-xs text-slate-400 text-right">
          {totalImages}/{maxFiles} images
        </p>
      )}
    </div>
  );
};

export default ImageUpload;


