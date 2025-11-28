import { useState } from 'react';
import PageLayout from '../components/layout/PageLayout';
import NewsFilters from '../components/news/NewsFilters';
import NewsList from '../components/news/NewsList';

const NewsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setSelectedCategory(null);
  };

  const handleCategoryChange = (category: string | null) => {
    setSelectedCategory(category);
    setSearchQuery('');
  };

  return (
    <PageLayout>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Crypto News</h1>
          <p className="text-slate-400">Stay updated with the latest cryptocurrency news and market insights</p>
        </div>

        <div className="mb-6">
          <NewsFilters
            onSearch={handleSearch}
            onCategoryChange={handleCategoryChange}
            selectedCategory={selectedCategory}
          />
        </div>

        <NewsList searchQuery={searchQuery || undefined} category={selectedCategory || undefined} />
      </main>
    </PageLayout>
  );
};

export default NewsPage;

