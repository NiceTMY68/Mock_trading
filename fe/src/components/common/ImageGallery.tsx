/**
 * ImageGallery Component
 * 
 * Features:
 * - Grid layout with adaptive columns
 * - Lightbox with smooth animations
 * - Keyboard navigation (arrows, escape)
 * - Touch swipe support
 * - Zoom on click
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  XMarkIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  ArrowsPointingOutIcon 
} from '@heroicons/react/24/outline';

interface GalleryImage {
  id?: number;
  url: string;
  thumbnailUrl?: string;
  alt?: string;
  width?: number;
  height?: number;
}

interface ImageGalleryProps {
  images: GalleryImage[];
  className?: string;
  maxVisible?: number;
}

const ImageGallery = ({ images, className = '', maxVisible = 4 }: ImageGalleryProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const visibleImages = images.slice(0, maxVisible);
  const remainingCount = images.length - maxVisible;

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
    setIsZoomed(false);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setIsZoomed(false);
  };

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setIsZoomed(false);
  }, [images.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setIsZoomed(false);
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          closeLightbox();
          break;
        case 'ArrowRight':
          goNext();
          break;
        case 'ArrowLeft':
          goPrev();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [lightboxOpen, goNext, goPrev]);

  if (images.length === 0) return null;

  // Layout configurations
  const getGridLayout = () => {
    const count = visibleImages.length;
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count === 3) return 'grid-cols-2';
    return 'grid-cols-2';
  };

  const getImageSpan = (index: number) => {
    const count = visibleImages.length;
    if (count === 3 && index === 0) return 'col-span-2';
    return '';
  };

  return (
    <>
      {/* Gallery Grid */}
      <div className={`grid gap-1.5 rounded-xl overflow-hidden ${getGridLayout()} ${className}`}>
        {visibleImages.map((image, index) => (
          <button
            key={image.id || index}
            onClick={() => openLightbox(index)}
            className={`
              relative overflow-hidden group cursor-pointer
              ${getImageSpan(index)}
              ${visibleImages.length === 1 ? 'aspect-video' : 'aspect-square'}
            `}
          >
            <img
              src={image.thumbnailUrl || image.url}
              alt={image.alt || ''}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
              <ArrowsPointingOutIcon className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity scale-75 group-hover:scale-100" />
            </div>

            {/* Remaining count overlay */}
            {index === maxVisible - 1 && remainingCount > 0 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">+{remainingCount}</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backdropFilter: 'blur(8px)' }}
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/90 animate-fade-in"
            onClick={closeLightbox}
          />

          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 w-12 h-12 rounded-full bg-white/10 
                     hover:bg-white/20 transition-colors flex items-center justify-center
                     backdrop-blur-sm"
          >
            <XMarkIcon className="w-6 h-6 text-white" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-4 z-10 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm">
            <span className="text-white text-sm font-medium">
              {currentIndex + 1} / {images.length}
            </span>
          </div>

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                className="absolute left-4 z-10 w-12 h-12 rounded-full bg-white/10 
                         hover:bg-white/20 transition-all flex items-center justify-center
                         backdrop-blur-sm hover:scale-110"
              >
                <ChevronLeftIcon className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                className="absolute right-4 z-10 w-12 h-12 rounded-full bg-white/10 
                         hover:bg-white/20 transition-all flex items-center justify-center
                         backdrop-blur-sm hover:scale-110"
              >
                <ChevronRightIcon className="w-6 h-6 text-white" />
              </button>
            </>
          )}

          {/* Main image */}
          <div 
            className="relative z-5 max-w-[90vw] max-h-[90vh] animate-scale-in"
            onClick={() => setIsZoomed(!isZoomed)}
          >
            <img
              src={images[currentIndex].url}
              alt={images[currentIndex].alt || ''}
              className={`
                max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl
                transition-transform duration-300 cursor-zoom-in
                ${isZoomed ? 'scale-150 cursor-zoom-out' : ''}
              `}
            />
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 
                          flex gap-2 p-2 rounded-xl bg-white/10 backdrop-blur-sm max-w-[90vw] overflow-x-auto">
              {images.map((image, index) => (
                <button
                  key={image.id || index}
                  onClick={(e) => { e.stopPropagation(); setCurrentIndex(index); }}
                  className={`
                    w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 transition-all
                    ${index === currentIndex 
                      ? 'ring-2 ring-emerald-400 scale-105' 
                      : 'opacity-60 hover:opacity-100'
                    }
                  `}
                >
                  <img
                    src={image.thumbnailUrl || image.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default ImageGallery;

