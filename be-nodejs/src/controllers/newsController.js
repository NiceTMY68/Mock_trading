import { getNewsService } from '../services/newsService.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export const getCryptoNews = async (req, res) => {
  try {
    const { 
      category = 'crypto',
      language = 'en',
      page = 1,
      size = 10,
      country = null
    } = req.query;

    const newsService = getNewsService();
    const news = await newsService.getCryptoNews({
      category,
      language,
      page: parseInt(page),
      size: parseInt(size),
      country
    });

    return paginatedResponse(
      res,
      news.results,
      parseInt(page),
      parseInt(size),
      news.totalResults
    );
  } catch (error) {
    logger.error('Error in getCryptoNews:', error);
    const statusCode = error.response?.status || 500;
    const message = error.message || 'Failed to fetch news';
    return errorResponse(res, { message, details: error.response?.data }, statusCode);
  }
};

export const searchNews = async (req, res) => {
  try {
    const { q, language = 'en', page = 1, size = 10 } = req.query;

    if (!q) {
      return errorResponse(res, { message: 'Search query (q) is required' }, 400);
    }

    const newsService = getNewsService();
    const news = await newsService.searchNews(q, {
      language,
      page: parseInt(page),
      size: parseInt(size)
    });

    return paginatedResponse(
      res,
      news.results,
      parseInt(page),
      parseInt(size),
      news.totalResults
    );
  } catch (error) {
    logger.error('Error in searchNews:', error);
    return errorResponse(res, { message: error.message || 'Failed to search news' }, 500);
  }
};

export const getNewsByCategory = async (req, res) => {
  try {
    const { category = 'crypto' } = req.params;
    const { language = 'en', page = 1, size = 10, country = null } = req.query;

    const newsService = getNewsService();
    const news = await newsService.getNewsByCategory(category, {
      language,
      page: parseInt(page),
      size: parseInt(size),
      country
    });

    return paginatedResponse(
      res,
      news.results,
      parseInt(page),
      parseInt(size),
      news.totalResults
    );
  } catch (error) {
    logger.error('Error in getNewsByCategory:', error);
    return errorResponse(res, { message: error.message || 'Failed to fetch news' }, 500);
  }
};

