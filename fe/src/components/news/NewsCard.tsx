import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { NewsArticle } from '../../api/news';
import ShareMenu from './ShareMenu';

interface NewsCardProps {
  article: NewsArticle;
  onShare?: (article: NewsArticle) => void;
}

const NewsCard = ({ article, onShare }: NewsCardProps) => {
  const [showShareMenu, setShowShareMenu] = useState(false);

  return (
    <article className="rounded-2xl border border-white/5 bg-slate-900/60 p-6 hover:border-emerald-300/40 transition">
      {(article.urlToImage || article.image_url) && (
        <div className="mb-4 overflow-hidden rounded-xl">
          <img
            src={article.urlToImage || article.image_url}
            alt={article.title}
            className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {article.source?.name && (
              <span className="px-2 py-1 text-xs rounded-full bg-white/5 text-slate-400 border border-white/10">
                {article.source.name}
              </span>
            )}
            {article.category && (
              <span className="px-2 py-1 text-xs rounded-full bg-emerald-400/10 text-emerald-300 border border-emerald-400/20">
                {Array.isArray(article.category) ? article.category[0] : article.category}
              </span>
            )}
            {article.sentiment && (
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  article.sentiment === 'positive'
                    ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20'
                    : article.sentiment === 'negative'
                    ? 'bg-rose-400/10 text-rose-300 border border-rose-400/20'
                    : 'bg-slate-400/10 text-slate-300 border border-slate-400/20'
                }`}
              >
                {article.sentiment}
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-400 transition"
            >
              {article.title}
            </a>
          </h3>
          {article.description && (
            <p className="text-sm text-slate-400 mb-3 line-clamp-3">{article.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <div className="flex items-center gap-4 text-xs text-slate-500">
          {(article.publishedAt || article.pubDate) && (
            <span>{formatDistanceToNow(new Date(article.publishedAt || article.pubDate!), { addSuffix: true })}</span>
          )}
          {(article.author || (article.creator && article.creator.length > 0)) && (
            <span>by {article.author || article.creator?.[0] || 'Unknown'}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => {
                setShowShareMenu(!showShareMenu);
                onShare?.(article);
              }}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-emerald-400 transition"
              title="Share"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
            {showShareMenu && <ShareMenu article={article} onClose={() => setShowShareMenu(false)} />}
          </div>
          <div className="relative group">
            <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-emerald-400 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
            <div className="absolute right-0 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition pointer-events-none">
              <div className="bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                Save
              </div>
            </div>
          </div>
          <a
            href={article.url || article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-400 text-slate-900 hover:bg-emerald-300 transition"
          >
            Read More →
          </a>
        </div>
      </div>
    </article>
  );
};

export default NewsCard;

