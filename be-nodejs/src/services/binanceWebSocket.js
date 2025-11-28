import WebSocket from 'ws';
import { getRedis } from '../config/redis.js';
import { logger } from '../utils/logger.js';

class BinanceWebSocketClient {
  constructor() {
    this.ws = null;
    this.reconnectInterval = 5000; // 5 seconds
    this.maxReconnectAttempts = 10;
    this.reconnectAttempts = 0;
    this.subscribedSymbols = new Set();
    this.isConnected = false;
    this.priceCache = new Map(); // In-memory cache for latest prices
    this.connectionStartTime = null; // Track connection time for 24h limit
    this.requestId = 0; // For SUBSCRIBE/UNSUBSCRIBE requests
    this.reconnectTimer = null; // Timer for 24h reconnection
  }

  /**
   * Connect to Binance WebSocket stream
   * @param {string[]} symbols - Array of trading pairs (e.g., ['btcusdt', 'ethusdt'])
   */
  async connect(symbols = ['btcusdt', 'ethusdt']) {
    if (this.ws && this.isConnected) {
      logger.info('Binance WebSocket already connected');
      return;
    }

    // Normalize symbols to lowercase
    const normalizedSymbols = symbols.map(s => s.toLowerCase());
    this.subscribedSymbols = new Set(normalizedSymbols);

    // Create stream names for Binance
    const streams = normalizedSymbols.map(symbol => `${symbol}@ticker`);
    const streamNames = streams.join('/');

    // Use combined stream endpoint according to Binance docs
    // https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams
    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streamNames}`;

    try {
      logger.info(`Connecting to Binance WebSocket: ${streamNames}`);
      this.ws = new WebSocket(wsUrl, {
        perMessageDeflate: false // Disable compression for better performance
      });

      this.ws.on('open', () => {
        logger.info('✅ Binance WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.connectionStartTime = Date.now();
        
        // Schedule reconnection before 24h limit (reconnect after 23 hours)
        // According to Binance docs: connection is valid for 24 hours
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
        }
        this.reconnectTimer = setTimeout(() => {
          logger.info('Reconnecting before 24h limit (23 hours elapsed)');
          this.disconnect();
          this.connect(Array.from(this.subscribedSymbols));
        }, 23 * 60 * 60 * 1000); // 23 hours in milliseconds
      });

      // Handle ping/pong frames (Binance sends ping every 20 seconds)
      this.ws.on('ping', (data) => {
        // Respond to ping with pong (copy ping payload)
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.pong(data);
          logger.debug('Responded to Binance ping with pong');
        }
      });

      this.ws.on('message', (data) => {
        // Check if it's a ping frame (not JSON)
        if (data instanceof Buffer && data.length <= 4) {
          // Likely a ping frame, respond with pong
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.pong();
            logger.debug('Responded to Binance ping frame');
          }
          return;
        }

        try {
          const message = JSON.parse(data.toString());
          
          // Handle SUBSCRIBE/UNSUBSCRIBE responses
          if (message.id !== undefined && message.result !== undefined) {
            if (message.result === null) {
              logger.debug(`Binance request ${message.id} succeeded`);
            } else if (Array.isArray(message.result)) {
              logger.debug(`Current subscriptions: ${message.result.join(', ')}`);
            }
            return;
          }

          // Handle error responses
          if (message.error) {
            logger.error('Binance WebSocket error:', message.error);
            return;
          }

          // Handle data messages
          this.handleMessage(message);
        } catch (error) {
          // If not JSON, might be a ping frame
          logger.debug('Non-JSON message received (likely ping frame)');
        }
      });

      this.ws.on('error', (error) => {
        logger.error('Binance WebSocket error:', error);
        this.isConnected = false;
      });

      this.ws.on('close', (code, reason) => {
        const connectionDuration = this.connectionStartTime 
          ? Math.floor((Date.now() - this.connectionStartTime) / 1000 / 60) 
          : 0;
        logger.warn(`Binance WebSocket closed (code: ${code}, reason: ${reason}, duration: ${connectionDuration} minutes)`);
        this.isConnected = false;
        this.connectionStartTime = null;
        
        // Reconnect if not a normal closure
        if (code !== 1000) {
          this.reconnect(normalizedSymbols);
        }
      });

    } catch (error) {
      logger.error('Failed to connect to Binance WebSocket:', error);
      this.reconnect(normalizedSymbols);
    }
  }

  /**
   * Handle incoming messages from Binance
   */
  async handleMessage(message) {
    if (message.stream && message.data) {
      const { stream, data } = message;
      
      // Extract symbol from stream name (e.g., "btcusdt@ticker" -> "btcusdt")
      const symbol = stream.split('@')[0].toUpperCase();
      
      // Process ticker data
      if (stream.includes('@ticker')) {
        const priceData = {
          symbol: symbol,
          price: parseFloat(data.c), // Last price
          open: parseFloat(data.o),
          high: parseFloat(data.h),
          low: parseFloat(data.l),
          close: parseFloat(data.c),
          volume: parseFloat(data.v),
          priceChange: parseFloat(data.p) || 0, // Price change (absolute)
          priceChangePercent: parseFloat(data.P) || 0, // Price change percent
          timestamp: new Date().toISOString(),
          binanceTimestamp: data.E
        };

        // Update cache
        this.priceCache.set(symbol, priceData);

        // Cache in Redis (silently fail if Redis is not available)
        try {
          const redis = getRedis();
          if (redis && redis.isOpen) {
            const cacheKey = `binance:price:${symbol.toLowerCase()}`;
            await redis.setEx(cacheKey, 60, JSON.stringify(priceData)); // 60 seconds TTL
          }
        } catch (error) {
          // Silently ignore Redis errors - app works without cache
          // Only log if it's not a connection error
          if (!error.message?.includes('closed') && !error.message?.includes('ClientClosedError')) {
            logger.warn('Failed to cache price in Redis:', error.message);
          }
        }

        // Emit event for WebSocket clients (will be handled by priceStream.js)
        logger.debug(`Price update for ${symbol}: $${priceData.price} (${priceData.priceChangePercent > 0 ? '+' : ''}${priceData.priceChangePercent.toFixed(2)}%)`);
        this.emitPriceUpdate(priceData);
      }
    }
  }

  /**
   * Emit price update to connected clients
   * This will be handled by the WebSocket server
   */
  emitPriceUpdate(priceData) {
    // This will be connected to the WebSocket server in index.js
    let broadcasted = false;
    
    if (this.onPriceUpdate) {
      this.onPriceUpdate(priceData);
      broadcasted = true;
      logger.debug(`Price update for ${priceData.symbol} sent via onPriceUpdate callback`);
    }
    
    // Also try global broadcaster if available
    if (typeof global !== 'undefined' && global.priceBroadcaster) {
      global.priceBroadcaster(priceData);
      broadcasted = true;
      logger.debug(`Price update for ${priceData.symbol} sent via global broadcaster`);
    }
    
    if (!broadcasted) {
      logger.warn(`Price update for ${priceData.symbol} was not broadcasted - no broadcaster available`);
    }
  }

  /**
   * Reconnect logic
   */
  reconnect(symbols) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached. Stopping reconnection.');
      return;
    }

    this.reconnectAttempts++;
    logger.info(`Reconnecting to Binance WebSocket (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect(symbols);
    }, this.reconnectInterval);
  }

  /**
   * Subscribe to additional symbols using SUBSCRIBE method (without reconnecting)
   * According to Binance docs: https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams
   */
  async subscribe(symbols) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('Cannot subscribe: Binance WebSocket not connected');
      return;
    }

    const normalizedSymbols = symbols.map(s => s.toLowerCase());
    const newSymbols = normalizedSymbols.filter(s => !this.subscribedSymbols.has(s));
    
    if (newSymbols.length === 0) {
      logger.debug('All symbols already subscribed to Binance');
      return;
    }

    // Create stream names for Binance
    const streams = newSymbols.map(symbol => `${symbol}@ticker`);
    
    // Use SUBSCRIBE method according to Binance documentation
    const subscribeRequest = {
      method: 'SUBSCRIBE',
      params: streams,
      id: ++this.requestId
    };

    try {
      this.ws.send(JSON.stringify(subscribeRequest));
      newSymbols.forEach(s => this.subscribedSymbols.add(s));
      logger.info(`✅ Subscribed to Binance WebSocket for new symbols: ${newSymbols.join(', ')} (Total subscribed: ${this.subscribedSymbols.size})`);
    } catch (error) {
      logger.error('Error subscribing to Binance WebSocket:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from symbols using UNSUBSCRIBE method (without reconnecting)
   */
  async unsubscribe(symbols) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('Cannot unsubscribe: WebSocket not connected');
      return;
    }

    const normalizedSymbols = symbols.map(s => s.toLowerCase());
    const streamsToUnsubscribe = normalizedSymbols
      .filter(s => this.subscribedSymbols.has(s))
      .map(symbol => `${symbol}@ticker`);

    if (streamsToUnsubscribe.length === 0) {
      logger.debug('No symbols to unsubscribe');
      return;
    }

    // Use UNSUBSCRIBE method according to Binance documentation
    const unsubscribeRequest = {
      method: 'UNSUBSCRIBE',
      params: streamsToUnsubscribe,
      id: ++this.requestId
    };

    try {
      this.ws.send(JSON.stringify(unsubscribeRequest));
      normalizedSymbols.forEach(s => this.subscribedSymbols.delete(s));
      logger.info(`Unsubscribed from symbols: ${normalizedSymbols.join(', ')}`);
    } catch (error) {
      logger.error('Error unsubscribing from symbols:', error);
      throw error;
    }
  }

  /**
   * Get latest price from cache
   */
  getLatestPrice(symbol) {
    return this.priceCache.get(symbol.toUpperCase());
  }

  /**
   * Get all cached prices
   */
  getAllPrices() {
    return Object.fromEntries(this.priceCache);
  }

  /**
   * Disconnect from Binance WebSocket
   */
  async disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
      this.connectionStartTime = null;
      logger.info('Binance WebSocket disconnected');
    }
  }
}

// Singleton instance
let binanceWSClient = null;

export const getBinanceWebSocket = () => {
  if (!binanceWSClient) {
    binanceWSClient = new BinanceWebSocketClient();
  }
  return binanceWSClient;
};

export const initBinanceWebSocket = async (symbols = ['btcusdt', 'ethusdt']) => {
  const client = getBinanceWebSocket();
  await client.connect(symbols);
  return client;
};

