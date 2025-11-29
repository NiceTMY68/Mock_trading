import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { globalSearch, SearchResults } from '../../api/search';
import { navigateWithQuery } from '../../utils/navigation';

interface SearchBarProps {
  onResultClick?: () => void;
  compact?: boolean;
}

const SearchBar = ({ onResultClick, compact = false }: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<'all' | 'coins' | 'posts' | 'news'>('all');
  const searchRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery<SearchResults>({
    queryKey: ['search', query, selectedType],
    queryFn: () => globalSearch({ q: query, type: selectedType, limit: 5 }),
    enabled: query.trim().length >= 2,
    staleTime: 30_000
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(value.trim().length >= 2);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim().length >= 2) {
      navigateWithQuery('/search', { q: query });
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleResultClick = () => {
    setIsOpen(false);
    if (onResultClick) {
      onResultClick();
    }
  };

  const hasResults = data && data.totalResults > 0;

  return (
    <div ref={searchRef} className="relative flex-1 max-w-xl">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
          placeholder="Search coins, posts, news..."
          className={`w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 pl-10 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none ${
            compact ? 'text-sm' : ''
          }`}
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            ×
          </button>
        )}
      </div>

      {isOpen && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 max-h-96 overflow-y-auto rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl z-50">
          {/* Type Filter */}
          <div className="flex gap-2 p-3 border-b border-white/10">
            {(['all', 'coins', 'posts', 'news'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition ${
                  selectedType === type
                    ? 'bg-emerald-400 text-slate-900'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          {/* Results */}
          {isLoading ? (
            <div className="p-4 text-center text-slate-400 text-sm">Searching...</div>
          ) : !hasResults ? (
            <div className="p-4 text-center text-slate-400 text-sm">No results found</div>
          ) : (
            <div className="divide-y divide-white/5">
              {/* Coins */}
              {data.coins.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase">Coins</div>
                  {data.coins.map((coin) => (
                    <a
                      key={coin.symbol}
                      href={`/coin/${coin.symbol}`}
                      onClick={handleResultClick}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{coin.symbol}</p>
                        <p className="text-xs text-slate-400">{coin.baseAsset}/{coin.quoteAsset}</p>
                      </div>
                      {coin.price && (
                        <div className="text-right">
                          <p className="text-sm text-white">${coin.price.toLocaleString()}</p>
                          {coin.change24h !== null && (
                            <p className={`text-xs ${coin.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {coin.change24h >= 0 ? '+' : ''}
                              {coin.change24h.toFixed(2)}%
                            </p>
                          )}
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              )}

              {/* Posts */}
              {data.posts.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase">Posts</div>
                  {data.posts.map((post) => (
                    <a
                      key={post.id}
                      href={`/posts/${post.id}`}
                      onClick={handleResultClick}
                      className="block px-4 py-3 hover:bg-white/5 transition"
                    >
                      <p className="text-sm font-semibold text-white mb-1 line-clamp-1">{post.title}</p>
                      <p className="text-xs text-slate-400 line-clamp-2">{post.content}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-slate-500">{post.author.name}</span>
                        <span className="text-xs text-slate-500">•</span>
                        <span className="text-xs text-slate-500">{post.commentsCount} comments</span>
                      </div>
                    </a>
                  ))}
                </div>
              )}

              {/* News */}
              {data.news.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase">News</div>
                  {data.news.map((article) => (
                    <a
                      key={article.id}
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={handleResultClick}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition"
                    >
                      {article.imageUrl && (
                        <img
                          src={article.imageUrl}
                          alt={article.title}
                          className="w-12 h-12 rounded object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white mb-1 line-clamp-1">{article.title}</p>
                        {article.description && (
                          <p className="text-xs text-slate-400 line-clamp-1">{article.description}</p>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              )}

              {/* View All */}
              {data.totalResults > 5 && (
                <div className="p-3 border-t border-white/10">
                  <a
                    href={`/search?q=${encodeURIComponent(query)}`}
                    onClick={handleResultClick}
                    className="block text-center text-sm text-emerald-400 hover:text-emerald-300 transition"
                  >
                    View all {data.totalResults} results →
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;

