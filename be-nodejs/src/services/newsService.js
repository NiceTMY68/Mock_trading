import axios from 'axios';
import { getRedis } from '../config/redis.js';
import { logger } from '../utils/logger.js';

class NewsService {
  constructor() {
    this.apiKey = process.env.NEWS_API_KEY;
    this.apiUrl = process.env.NEWS_API_URL || 'https://newsdata.io/api/1';
    this.cacheTTL = 15 * 60; // 15 minutes in seconds
    
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

    // Create cache key
    const cacheKey = `news:crypto:${language}:${nextPage || 'first'}:${size}`;

    try {
      // Check cache first
      const redis = getRedis();
      if (redis) {
        const cached = await redis.get(cacheKey);
        if (cached) {
          logger.debug('Returning cached news');
          return JSON.parse(cached);
        }
      }

      // Check if API key is set
      if (!this.apiKey) {
        throw new Error('NEWS_API_KEY is not configured');
      }

      // Build query parameters
      // Note: NewsData.io free tier doesn't support 'category' parameter
      // Use 'q' parameter to search for crypto-related news instead
      const params = {
        apikey: this.apiKey,
        q: category === 'crypto' 
          ? 'crypto OR cryptocurrency OR bitcoin OR ethereum OR blockchain OR defi OR nft'
          : category, // Allow custom search terms
        language: language,
        size: Math.min(size, 10) // Free tier max is 10 articles per request
      };

      // Use nextPage token if provided (for pagination)
      if (nextPage) {
        params.nextPage = nextPage;
      }

      if (country) {
        params.country = country;
      }

      // Fetch from API
      logger.info(`Fetching crypto news from NewsData.io${nextPage ? ' (nextPage)' : ' (first page)'}`);
      const response = await axios.get(`${this.apiUrl}/news`, {
        params,
        timeout: 10000 // 10 seconds timeout
      });

      // Log response for debugging
      logger.debug('NewsData.io response status:', response.data.status);
      
      if (response.data.status === 'success') {
        const newsData = {
          status: 'success',
          totalResults: response.data.totalResults || response.data.results?.length || 0,
          results: response.data.results || [],
          nextPage: response.data.nextPage || null,
          timestamp: new Date().toISOString()
        };

        // Cache the result
        if (redis) {
          await redis.setEx(cacheKey, this.cacheTTL, JSON.stringify(newsData));
        }

        return newsData;
      } else {
        // Handle error response from NewsData.io
        const errorMsg = response.data.results?.message || response.data.message || 'Failed to fetch news';
        logger.error('NewsData.io API error:', errorMsg, response.data);
        throw new Error(errorMsg);
      }
    } catch (error) {
      // Log detailed error information
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        logger.error('NewsData.io API error response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      } else if (error.request) {
        // The request was made but no response was received
        logger.error('NewsData.io API request error: No response received', error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        logger.error('Error fetching crypto news:', error.message);
      }
      
      // Try to return cached data if available
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

      // Re-throw with more context
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
      // Check cache
      const redis = getRedis();
      if (redis) {
        const cached = await redis.get(cacheKey);
        if (cached) {
          logger.debug('Returning cached search results');
          return JSON.parse(cached);
        }
      }

      // Build query
      // Note: NewsData.io free tier doesn't support page parameter or category filter
      const params = {
        apikey: this.apiKey,
        q: keyword,
        language: language,
        size: Math.min(size, 10) // Free tier max is 10 articles per request
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

        // Cache for shorter time (5 minutes for search results)
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
   * @param {string} category - News category
   */
  async getNewsByCategory(category = 'crypto') {
    return this.getCryptoNews({ category });
  }
}

// Singleton instance
let newsService = null;

export const getNewsService = () => {
  if (!newsService) {
    newsService = new NewsService();
  }
  return newsService;
};

