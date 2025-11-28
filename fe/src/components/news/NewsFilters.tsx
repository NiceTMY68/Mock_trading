import { useState } from 'react';

interface NewsFiltersProps {
  onSearch: (query: string) => void;
  onCategoryChange: (category: string | null) => void;
  selectedCategory: string | null;
}

const categories = [
  { id: null, label: 'All News' },
  { id: 'bitcoin', label: 'Bitcoin' },
  { id: 'ethereum', label: 'Ethereum' },
  { id: 'defi', label: 'DeFi' },
  { id: 'nft', label: 'NFT' },
  { id: 'regulation', label: 'Regulation' },
  { id: 'market', label: 'Market' },
  { id: 'technology', label: 'Technology' },
  { id: 'adoption', label: 'Adoption' }
];

const NewsFilters = ({ onSearch, onCategoryChange, selectedCategory }: NewsFiltersProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search crypto news..."
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:border-emerald-400 outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-emerald-400 px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-400/30 hover:bg-emerald-300 transition"
        >
          Search
        </button>
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              onSearch('');
            }}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white hover:bg-white/10 transition"
          >
            Clear
          </button>
        )}
      </form>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category.id || 'all'}
            onClick={() => onCategoryChange(category.id)}
            className={`px-4 py-2 text-sm font-medium rounded-full transition ${
              selectedCategory === category.id
                ? 'bg-emerald-400 text-slate-900 shadow-lg shadow-emerald-400/30'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default NewsFilters;

