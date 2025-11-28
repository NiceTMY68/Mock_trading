import { PostModel } from '../models/postModel.js';
import { getNewsService } from '../services/newsService.js';
import { getBinanceService } from '../services/binanceService.js';
import { logger } from '../utils/logger.js';
import { createResponse } from '../utils/response.js';

/**
 * Global search across coins, posts, and news
 * GET /api/search
 */
export const globalSearch = async (req, res) => {
  try {
    const { q, type, limit = 10 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json(createResponse(false, 'Search query is required'));
    }

    const query = q.trim();
    const searchType = type || 'all'; // 'all', 'coins', 'posts', 'news'
    const limitNum = Math.min(parseInt(limit) || 10, 50);

    const results = {
      query,
      coins: [],
      posts: [],
      news: []
    };

    // Search coins/symbols
    if (searchType === 'all' || searchType === 'coins') {
      try {
        const binanceService = getBinanceService();
        const symbols = await binanceService.getSymbols();
        
        // Filter symbols by query (case-insensitive)
        const matchingSymbols = symbols
          .filter(s => 
            s.symbol.toUpperCase().includes(query.toUpperCase()) ||
            s.baseAsset.toUpperCase().includes(query.toUpperCase()) ||
            s.quoteAsset.toUpperCase().includes(query.toUpperCase())
          )
          .slice(0, limitNum);

        // Get ticker data for matching symbols
        const coinResults = await Promise.all(
          matchingSymbols.map(async (symbol) => {
            try {
              const ticker = await binanceService.getTicker(symbol.symbol);
              return {
                symbol: symbol.symbol,
                baseAsset: symbol.baseAsset,
                quoteAsset: symbol.quoteAsset,
                price: ticker.lastPrice,
                change24h: ticker.priceChangePercent,
                volume24h: ticker.volume
              };
            } catch (error) {
              logger.warn(`Failed to get ticker for ${symbol.symbol}:`, error.message);
              return {
                symbol: symbol.symbol,
                baseAsset: symbol.baseAsset,
                quoteAsset: symbol.quoteAsset,
                price: null,
                change24h: null,
                volume24h: null
              };
            }
          })
        );

        results.coins = coinResults;
      } catch (error) {
        logger.error('Error searching coins:', error);
        // Continue with other searches even if coins search fails
      }
    }

    // Search posts
    if (searchType === 'all' || searchType === 'posts') {
      try {
        const postsResult = await PostModel.findMany({
          page: 0,
          size: limitNum,
          status: 'published',
          search: query,
          sortBy: 'created_at',
          order: 'DESC'
        });

        results.posts = postsResult.items.map(post => ({
          id: post.id,
          title: post.title,
          content: post.content.substring(0, 200) + (post.content.length > 200 ? '...' : ''),
          author: {
            id: post.user_id,
            name: post.author_name,
            avatar: post.author_avatar
          },
          commentsCount: parseInt(post.comments_count) || 0,
          reactionsCount: parseInt(post.reactions_count) || 0,
          createdAt: post.created_at,
          tags: post.tags || []
        }));
      } catch (error) {
        logger.error('Error searching posts:', error);
      }
    }

    // Search news
    if (searchType === 'all' || searchType === 'news') {
      try {
        const newsService = getNewsService();
        const newsResult = await newsService.searchNews(query, {
          page: 1,
          size: limitNum
        });

        results.news = (newsResult.results || []).map(article => ({
          id: article.article_id || article.id,
          title: article.title,
          description: article.description || article.content?.substring(0, 200),
          url: article.link || article.url,
          imageUrl: article.image_url || article.urlToImage,
          source: article.source_id || article.source?.name,
          publishedAt: article.pubDate || article.publishedAt,
          category: article.category?.[0] || 'crypto'
        }));
      } catch (error) {
        logger.error('Error searching news:', error);
      }
    }

    // Calculate totals
    const totalResults = results.coins.length + results.posts.length + results.news.length;

    res.json(createResponse(true, 'Search completed', {
      ...results,
      totalResults
    }));
  } catch (error) {
    logger.error('Global search error:', error);
    res.status(500).json(createResponse(false, 'Internal server error'));
  }
};

