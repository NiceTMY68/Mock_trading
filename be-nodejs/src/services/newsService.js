import axios from 'axios';
import { getRedis } from '../config/redis.js';
import { logger } from '../utils/logger.js';

class NewsService {
  constructor() {
    this.apiKey = process.env.NEWS_API_KEY;
    this.apiUrl = process.env.NEWS_API_URL || 'https://newsdata.io/api/1';
    this.cacheTTL = 15 * 60;
    
    // Map category to search query for NewsData.io API
    this.categoryMap = {
      'crypto': 'crypto OR cryptocurrency OR bitcoin OR ethereum OR blockchain OR defi OR nft',
      'bitcoin': 'bitcoin OR BTC',
      'ethereum': 'ethereum OR ETH OR ethereum blockchain',
      'defi': 'defi OR decentralized finance OR DeFi protocol',
      'nft': 'nft OR non-fungible token OR NFT marketplace',
      'regulation': 'crypto regulation OR cryptocurrency regulation OR crypto law OR SEC crypto',
      'market': 'crypto market OR cryptocurrency market OR crypto price OR crypto trading',
      'technology': 'blockchain technology OR crypto technology OR cryptocurrency technology',
      'adoption': 'crypto adoption OR cryptocurrency adoption OR bitcoin adoption'
    };
    
    if (!this.apiKey) {
      logger.warn('NEWS_API_KEY is not set. News features will not work.');
    }
  }

  /**
   * Get crypto news from NewsData.io
   * @param {Object} options - Query options
   * @param {string} options.category - News category (default: 'crypto')
   * @param {string} options.language - Language code (default: 'en')
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.size - Results per page (default: 10)
   * @param {string} options.country - Country code (optional)
   */
  async getCryptoNews(options = {}) {
    const {
      category = 'crypto',
      language = 'en',
      page = 1,
      size = 10,
      country = null,
      nextPage = null
    } = options;

    // Map category to search query
    const searchQuery = this.categoryMap[category] || category;
    
    // Include category in cache key to avoid cache collision
    const cacheKey = `news:${category}:${language}:${nextPage || 'first'}:${size}`;

    try {
      const redis = getRedis();
      if (redis) {
        const cached = await redis.get(cacheKey);
        if (cached) {
          logger.debug(`Returning cached news for category: ${category}`);
          return JSON.parse(cached);
        }
      }

      if (!this.apiKey) {
        throw new Error('NEWS_API_KEY is not configured');
      }

      const params = {
        apikey: this.apiKey,
        q: searchQuery,
        language: language,
        size: Math.min(size, 10)
      };

      if (nextPage) {
        params.nextPage = nextPage;
      }

      if (country) {
        params.country = country;
      }

      logger.info(`Fetching news for category "${category}" from NewsData.io (query: ${searchQuery})${nextPage ? ' (nextPage)' : ' (first page)'}`);
      const response = await axios.get(`${this.apiUrl}/news`, {
        params,
        timeout: 10000
      });

      logger.debug('NewsData.io response status:', response.data.status);
      
      if (response.data.status === 'success') {
        const newsData = {
          status: 'success',
          totalResults: response.data.totalResults || response.data.results?.length || 0,
          results: response.data.results || [],
          nextPage: response.data.nextPage || null,
          timestamp: new Date().toISOString()
        };

        if (redis) {
          await redis.setEx(cacheKey, this.cacheTTL, JSON.stringify(newsData));
        }

        return newsData;
      } else {
        const errorMsg = response.data.results?.message || response.data.message || 'Failed to fetch news';
        logger.error('NewsData.io API error:', errorMsg, response.data);
        throw new Error(errorMsg);
      }
    } catch (error) {
      if (error.response) {
        logger.error('NewsData.io API error response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      } else if (error.request) {
        logger.error('NewsData.io API request error: No response received', error.request);
      } else {
        logger.error('Error fetching crypto news:', error.message);
      }
      
      try {
        const redis = getRedis();
        if (redis) {
          const cached = await redis.get(cacheKey);
          if (cached) {
            logger.warn('Returning stale cached news due to API error');
            return JSON.parse(cached);
          }
        }
      } catch (cacheError) {
        logger.error('Error reading cache:', cacheError);
      }

      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch news from NewsData.io';
      throw new Error(errorMessage);
    }
  }

  /**
   * Search news by keyword
   * @param {string} keyword - Search keyword
   * @param {Object} options - Additional options
   */
  async searchNews(keyword, options = {}) {
    const {
      language = 'en',
      page = 1,
      size = 10
    } = options;

    const cacheKey = `news:search:${keyword}:${language}:${page}:${size}`;

    try {
      const redis = getRedis();
      if (redis) {
        const cached = await redis.get(cacheKey);
        if (cached) {
          logger.debug('Returning cached search results');
          return JSON.parse(cached);
        }
      }

      const params = {
        apikey: this.apiKey,
        q: keyword,
        language: language,
        size: Math.min(size, 10)
      };

      logger.info(`Searching news for: ${keyword}`);
      const response = await axios.get(`${this.apiUrl}/news`, {
        params,
        timeout: 10000
      });

      if (response.data.status === 'success') {
        const newsData = {
          status: 'success',
          keyword: keyword,
          totalResults: response.data.totalResults || 0,
          results: response.data.results || [],
          nextPage: response.data.nextPage || null,
          timestamp: new Date().toISOString()
        };

        if (redis) {
          await redis.setEx(cacheKey, 5 * 60, JSON.stringify(newsData));
        }

        return newsData;
      } else {
        throw new Error(response.data.message || 'Failed to search news');
      }
    } catch (error) {
      logger.error('Error searching news:', error.message);
      throw error;
    }
  }

  /**
   * Get news by category
   * @param {string} category - News category (bitcoin, ethereum, defi, nft, etc.)
   * @param {Object} options - Additional options (language, page, size, etc.)
   */
  async getNewsByCategory(category = 'crypto', options = {}) {
    return this.getCryptoNews({ category, ...options });
  }
}

let newsService = null;

export const getNewsService = () => {
  if (!newsService) {
    newsService = new NewsService();
  }
  return newsService;
};

