import { useState, useRef, useEffect } from 'react';
import { NewsArticle } from '../../api/news';

interface ShareMenuProps {
  article: NewsArticle;
  onClose: () => void;
}

const ShareMenu = ({ article, onClose }: ShareMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleShare = (platform: string) => {
    const articleUrl = article.url || article.link || '';
    const url = encodeURIComponent(articleUrl);
    const title = encodeURIComponent(article.title);
    const text = encodeURIComponent(article.description || article.title);

    let shareUrl = '';

    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
        break;
      case 'reddit':
        shareUrl = `https://reddit.com/submit?url=${url}&title=${title}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${url}&text=${title}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${title}%20${url}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(article.url || article.link || '');
        onClose();
        return;
      default:
        return;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
      onClose();
    }
  };

  const shareOptions = [
    { id: 'twitter', label: 'Twitter', icon: '🐦' },
    { id: 'facebook', label: 'Facebook', icon: '📘' },
    { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
    { id: 'reddit', label: 'Reddit', icon: '🤖' },
    { id: 'telegram', label: 'Telegram', icon: '✈️' },
    { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
    { id: 'copy', label: 'Copy Link', icon: '📋' }
  ];

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-xl p-2 shadow-2xl z-50"
    >
      {shareOptions.map((option) => (
        <button
          key={option.id}
          onClick={() => handleShare(option.id)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition text-left text-sm text-white"
        >
          <span className="text-lg">{option.icon}</span>
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
};

export default ShareMenu;

