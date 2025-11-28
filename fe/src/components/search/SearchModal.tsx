import React, { useState, useEffect, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { MagnifyingGlassIcon, XMarkIcon, ClockIcon } from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import { globalSearch, SearchResults } from '../../api/search';
import { navigate } from '../../utils/navigation';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchModal = ({ isOpen, onClose }: SearchModalProps) => {
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'coins' | 'posts' | 'news'>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery<SearchResults>({
    queryKey: ['search', query, selectedType],
    queryFn: () => globalSearch({ q: query, type: selectedType, limit: 8 }),
    enabled: query.trim().length >= 2,
    staleTime: 30_000
  });

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!isOpen) {
          // This would be handled by parent component
        }
      }
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleResultClick = (type: string, id: string | number) => {
    if (type === 'coin') {
      navigate(`/coin/${id}`);
    } else if (type === 'post') {
      navigate(`/posts/${id}`);
    }
    onClose();
  };

  const handleSearch = () => {
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
      onClose();
    }
  };

  const totalResults = data ? (data.coins?.length || 0) + (data.posts?.length || 0) + (data.news?.length || 0) : 0;

  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto p-4 pt-[20vh]">
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="mx-auto max-w-2xl rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl">
              {/* Search Input */}
              <div className="flex items-center gap-3 border-b border-white/10 p-4">
                <MagnifyingGlassIcon className="w-5 h-5 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  placeholder="Search coins, posts, news..."
                  className="flex-1 bg-transparent text-white placeholder-slate-500 focus:outline-none text-lg"
                />
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-2 border-b border-white/10 px-4 py-2">
                {(['all', 'coins', 'posts', 'news'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition capitalize ${
                      selectedType === type
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : 'text-slate-400 hover:text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Results */}
              <div className="max-h-[60vh] overflow-y-auto">
                {query.trim().length < 2 ? (
                  <div className="p-8 text-center">
                    <MagnifyingGlassIcon className="mx-auto w-12 h-12 text-slate-600 mb-3" />
                    <p className="text-slate-400 text-sm">Type at least 2 characters to search</p>
                    <p className="text-slate-600 text-xs mt-2">
                      Press <kbd className="px-2 py-1 bg-slate-800 rounded">Cmd</kbd> + <kbd className="px-2 py-1 bg-slate-800 rounded">K</kbd> to open search
                    </p>
                  </div>
                ) : isLoading ? (
                  <div className="p-8 text-center text-slate-400">
                    <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-3" />
                    Searching...
                  </div>
                ) : totalResults === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    No results found for "{query}"
                  </div>
                ) : (
                  <div className="p-2">
                    {/* Coins */}
                    {data?.coins && data.coins.length > 0 && (
                      <div className="mb-3">
                        <p className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Coins ({data.coins.length})
                        </p>
                        {data.coins.map((coin) => (
                          <button
                            key={coin.symbol}
                            onClick={() => handleResultClick('coin', coin.symbol)}
                            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-white/5 transition group"
                          >
                            <div className="flex-1">
                              <p className="text-white font-medium group-hover:text-cyan-300 transition">
                                {coin.symbol}
                              </p>
                              <p className="text-sm text-slate-400">
                                ${coin.price?.toFixed(2) || 'N/A'}
                              </p>
                            </div>
                            <span className={`text-sm font-medium ${
                              (coin.priceChangePercent || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {(coin.priceChangePercent || 0) >= 0 ? '+' : ''}
                              {coin.priceChangePercent?.toFixed(2)}%
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Posts */}
                    {data?.posts && data.posts.length > 0 && (
                      <div className="mb-3">
                        <p className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Posts ({data.posts.length})
                        </p>
                        {data.posts.map((post) => (
                          <button
                            key={post.id}
                            onClick={() => handleResultClick('post', post.id)}
                            className="w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-white/5 transition group"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium group-hover:text-purple-300 transition truncate">
                                {post.title}
                              </p>
                              <p className="text-sm text-slate-400 truncate">
                                by {post.author_name}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* View All Results */}
                    <button
                      onClick={handleSearch}
                      className="w-full mt-2 px-3 py-2.5 text-sm text-cyan-400 hover:text-cyan-300 hover:bg-white/5 rounded-lg transition text-center font-medium"
                    >
                      View all results for "{query}" →
                    </button>
                  </div>
                )}
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

export default SearchModal;

