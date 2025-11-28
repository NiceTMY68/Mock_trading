import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageLayout from '../components/layout/PageLayout';
import Link from '../components/common/Link';
import { navigate, navigateWithQuery, getQueryParam } from '../utils/navigation';
import { globalSearch, SearchResults } from '../api/search';
import { formatDistanceToNow } from 'date-fns';

const SearchPage = () => {
  const [query, setQuery] = useState(getQueryParam('q') || '');
  const [searchQuery, setSearchQuery] = useState(query);
  const [selectedType, setSelectedType] = useState<'all' | 'coins' | 'posts' | 'news'>('all');

  useEffect(() => {
    const urlQuery = getQueryParam('q') || '';
    setQuery(urlQuery);
    setSearchQuery(urlQuery);
  }, []);

  const { data, isLoading, error } = useQuery<SearchResults>({
    queryKey: ['search', query, selectedType],
    queryFn: () => globalSearch({ q: query, type: selectedType, limit: 20 }),
    enabled: query.trim().length >= 2
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length >= 2) {
      const newQuery = searchQuery.trim();
      setQuery(newQuery);
      navigateWithQuery('/search', { q: newQuery });
    }
  };

  if (!query || query.trim().length < 2) {
    return (
      <PageLayout>
        <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">Search</h1>
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search coins, posts, news..."
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 pl-12 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
                />
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <button
                type="submit"
                className="mt-4 rounded-lg bg-emerald-400 px-6 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-400/30 hover:bg-emerald-300 transition"
              >
                Search
              </button>
            </form>
          </div>
        </main>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search coins, posts, news..."
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 pl-12 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
            />
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </form>

        {/* Type Filter */}
        <div className="flex gap-2 mb-6">
          {(['all', 'coins', 'posts', 'news'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-4 py-2 text-sm font-medium rounded-full transition ${
                selectedType === type
                  ? 'bg-emerald-400 text-slate-900 shadow-lg shadow-emerald-400/30'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-white/5 bg-slate-900/60 p-6 animate-pulse">
                <div className="h-6 bg-white/10 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-white/10 rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-white/5 bg-slate-900/60 p-8 text-center">
            <p className="text-rose-400">Error loading search results. Please try again.</p>
          </div>
        ) : !data || data.totalResults === 0 ? (
          <div className="rounded-xl border border-white/5 bg-slate-900/60 p-12 text-center">
            <p className="text-slate-400 mb-2">No results found for "{query}"</p>
            <p className="text-sm text-slate-500">Try a different search term</p>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-slate-400">
              Found {data.totalResults} result{data.totalResults !== 1 ? 's' : ''} for "{query}"
            </p>

            {/* Coins */}
            {(selectedType === 'all' || selectedType === 'coins') && data.coins.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-white mb-4">Coins ({data.coins.length})</h2>
                <div className="space-y-2">
                  {data.coins.map((coin) => (
                    <a
                      key={coin.symbol}
                      href={`/coin/${coin.symbol}`}
                      className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-slate-900/60 hover:bg-slate-800/60 transition"
                    >
                      <div>
                        <p className="text-lg font-semibold text-white">{coin.symbol}</p>
                        <p className="text-sm text-slate-400">{coin.baseAsset}/{coin.quoteAsset}</p>
                      </div>
                      {coin.price && (
                        <div className="text-right">
                          <p className="text-lg font-semibold text-white">${coin.price.toLocaleString()}</p>
                          {coin.change24h !== null && (
                            <p className={`text-sm ${coin.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {coin.change24h >= 0 ? '+' : ''}
                              {coin.change24h.toFixed(2)}%
                            </p>
                          )}
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Posts */}
            {(selectedType === 'all' || selectedType === 'posts') && data.posts.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-white mb-4">Posts ({data.posts.length})</h2>
                <div className="space-y-3">
                  {data.posts.map((post) => (
                    <a
                      key={post.id}
                      href={`/posts/${post.id}`}
                      className="block p-4 rounded-xl border border-white/5 bg-slate-900/60 hover:bg-slate-800/60 transition"
                    >
                      <h3 className="text-lg font-semibold text-white mb-2">{post.title}</h3>
                      <p className="text-sm text-slate-400 mb-3 line-clamp-2">{post.content}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>{post.author.name}</span>
                        <span>•</span>
                        <span>{post.commentsCount} comments</span>
                        <span>•</span>
                        <span>{post.reactionsCount} reactions</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* News */}
            {(selectedType === 'all' || selectedType === 'news') && data.news.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-white mb-4">News ({data.news.length})</h2>
                <div className="space-y-3">
                  {data.news.map((article) => (
                    <a
                      key={article.id}
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-slate-900/60 hover:bg-slate-800/60 transition"
                    >
                      {article.imageUrl && (
                        <img
                          src={article.imageUrl}
                          alt={article.title}
                          className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">{article.title}</h3>
                        {article.description && (
                          <p className="text-sm text-slate-400 mb-2 line-clamp-2">{article.description}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          {article.source && <span>{article.source}</span>}
                          {article.source && article.publishedAt && <span>•</span>}
                          {article.publishedAt && (
                            <span>{formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}</span>
                          )}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </PageLayout>
  );
};

export default SearchPage;

