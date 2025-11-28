import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCryptoNews, searchNews, getNewsByCategory, NewsArticle } from '../../api/news';
import NewsCard from './NewsCard';

interface NewsListProps {
  searchQuery?: string;
  category?: string;
}

const NewsList = ({ searchQuery, category }: NewsListProps) => {
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const { data, isLoading, error } = useQuery({
    queryKey: ['news', searchQuery, category, page],
    queryFn: async () => {
      if (searchQuery) {
        return searchNews({ q: searchQuery, page, pageSize });
      } else if (category) {
        return getNewsByCategory({ category, page, pageSize });
      } else {
        return getCryptoNews({ page, pageSize });
      }
    },
    refetchInterval: 60_000 // Refetch every minute
  });

  const articles = data?.articles || data?.results || [];
  const totalResults = data?.totalResults || articles.length;
  const totalPages = Math.ceil(totalResults / pageSize);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-white/5 bg-slate-900/60 p-6 animate-pulse">
            <div className="h-48 bg-white/10 rounded-xl mb-4"></div>
            <div className="h-6 bg-white/10 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-white/10 rounded w-full mb-2"></div>
            <div className="h-4 bg-white/10 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-8 text-center">
        <p className="text-rose-400 mb-4">Failed to load news. Please try again later.</p>
        <button
          onClick={() => window.location.reload()}
          className="text-emerald-400 hover:text-emerald-300 underline"
        >
          Reload
        </button>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-12 text-center">
        <p className="text-slate-400 mb-2">No news articles found</p>
        {searchQuery && (
          <p className="text-sm text-slate-500">Try a different search term</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {articles.map((article, index) => (
          <NewsCard key={article.id || article.url || index} article={article} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <p className="text-sm text-slate-400">
            Page {page} of {totalPages} • {totalResults} articles
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white transition hover:border-emerald-300 disabled:cursor-not-allowed disabled:border-white/5 disabled:text-slate-600"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => prev + 1)}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white transition hover:border-emerald-300 disabled:cursor-not-allowed disabled:border-white/5 disabled:text-slate-600"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsList;

