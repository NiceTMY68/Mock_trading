import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../utils/logger.js';
import jwt from 'jsonwebtoken';
import { getBinanceWebSocket } from '../services/binanceWebSocket.js';
import { getWebSocketLimit } from '../middleware/rateLimiter.js';

// Must match the secret used in authController.js
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Setup price streaming WebSocket server
 * @param {WebSocketServer} wss - WebSocket server instance
 * @param {Function} onPriceUpdate - Callback when price updates from Binance
 */
export const setupPriceStream = (wss, onPriceUpdate) => {
  const subscriptions = new Map(); // Map<ws, Set<symbols>>
  const pendingBinanceSubscriptions = new Set(); // Queue for symbols to subscribe when Binance connects
  const noSubscriberWarnings = new Map(); // Track last warning time per symbol to avoid spam

  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    logger.info(`New WebSocket connection for price streaming from ${clientIp}`);

    // Optional: Authenticate via query parameter or header
    const token = new URL(req.url, 'http://localhost').searchParams.get('token');
    let userId = null;
    let userRole = 'anonymous';

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.userId || decoded.id;
        userRole = decoded.role || 'user';
        logger.info(`Authenticated WebSocket connection for user: ${userId} (role: ${userRole})`);
      } catch (error) {
        logger.warn('Invalid token in WebSocket connection');
        // Don't close connection - allow anonymous access
      }
    }

    // Get subscription limit based on role
    const subscriptionLimit = getWebSocketLimit(userRole);

    // Initialize subscription set for this connection
    subscriptions.set(ws, new Set());
    
    // Store user info and limit in connection metadata
    ws.userId = userId;
    ws.userRole = userRole;
    ws.subscriptionLimit = subscriptionLimit;

    // Send welcome message
    try {
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to Crypto Community Platform Price Stream',
        timestamp: new Date().toISOString(),
        authenticated: !!userId
      }));
      logger.info(`Sent welcome message to client ${clientIp}`);
    } catch (error) {
      logger.error('Error sending welcome message:', error);
    }

    // Handle incoming messages
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());

        switch (data.action) {
          case 'subscribe':
            handleSubscribe(ws, data.symbols || []).catch(error => {
              logger.error('Error in handleSubscribe:', error);
            });
            break;
          case 'unsubscribe':
            handleUnsubscribe(ws, data.symbols || []);
            break;
          case 'ping':
            ws.send(JSON.stringify({
              type: 'pong',
              timestamp: new Date().toISOString()
            }));
            break;
          default:
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Unknown action'
            }));
        }
      } catch (error) {
        logger.error('Error handling WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    // Handle connection close
    ws.on('close', () => {
      logger.info('WebSocket connection closed');
      subscriptions.delete(ws);
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.error('WebSocket error:', error);
      subscriptions.delete(ws);
    });
  });

  /**
   * Handle subscribe action
   */
  async function handleSubscribe(ws, symbols) {
    if (!Array.isArray(symbols) || symbols.length === 0) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid symbols array'
      }));
      return;
    }

    // Normalize symbols to uppercase for client subscription
    const normalizedSymbols = symbols.map(s => s.toUpperCase());
    const userSubs = subscriptions.get(ws);

    if (!userSubs) {
      logger.warn('Subscription set not found for WebSocket connection');
      return;
    }

    // Get subscription limit for this connection
    const maxSubscriptions = ws.subscriptionLimit || 5;
    if (userSubs.size + normalizedSymbols.length > maxSubscriptions) {
      ws.send(JSON.stringify({
        type: 'error',
        message: `Maximum ${maxSubscriptions} subscriptions allowed for your account type`
      }));
      return;
    }

    // Add to client subscription list
    normalizedSymbols.forEach(symbol => userSubs.add(symbol));

    // Subscribe to Binance WebSocket for new symbols
    // Convert to lowercase for Binance (Binance uses lowercase)
    const binanceSymbols = normalizedSymbols.map(s => s.toLowerCase());
    try {
      const binanceWS = getBinanceWebSocket();
      if (binanceWS && binanceWS.isConnected) {
        await binanceWS.subscribe(binanceSymbols);
        logger.info(`✅ Subscribed to Binance WebSocket for symbols: ${normalizedSymbols.join(', ')}`);
      } else {
        // Queue for later when Binance connects
        binanceSymbols.forEach(s => pendingBinanceSubscriptions.add(s));
        logger.info(`⏳ Queued Binance subscriptions (Binance not ready): ${normalizedSymbols.join(', ')}`);
        
        // Try to subscribe after a delay (Binance should be connected by then)
        setTimeout(async () => {
          const binanceWSRetry = getBinanceWebSocket();
          if (binanceWSRetry && binanceWSRetry.isConnected && pendingBinanceSubscriptions.size > 0) {
            const symbolsToSubscribe = Array.from(pendingBinanceSubscriptions);
            try {
              await binanceWSRetry.subscribe(symbolsToSubscribe);
              logger.info(`✅ [Retry] Subscribed to Binance: ${symbolsToSubscribe.join(', ')}`);
              pendingBinanceSubscriptions.clear();
            } catch (err) {
              logger.error('Error in delayed Binance subscription:', err);
            }
          }
        }, 3000);
      }
    } catch (error) {
      logger.error('Error subscribing to Binance WebSocket:', error);
      // Continue anyway - client subscription is still valid
    }

    try {
      ws.send(JSON.stringify({
        type: 'subscribed',
        symbols: Array.from(userSubs),
        timestamp: new Date().toISOString()
      }));
      logger.info(`Subscribed client to symbols: ${normalizedSymbols.join(', ')} (Total: ${userSubs.size})`);
    } catch (error) {
      logger.error('Error sending subscription confirmation:', error);
    }
  }

  /**
   * Handle unsubscribe action
   */
  function handleUnsubscribe(ws, symbols) {
    if (!Array.isArray(symbols)) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid symbols array'
      }));
      return;
    }

    const normalizedSymbols = symbols.map(s => s.toUpperCase());
    const userSubs = subscriptions.get(ws);

    normalizedSymbols.forEach(symbol => userSubs.delete(symbol));

    ws.send(JSON.stringify({
      type: 'unsubscribed',
      symbols: normalizedSymbols,
      remaining: Array.from(userSubs),
      timestamp: new Date().toISOString()
    }));

    logger.info(`Unsubscribed from symbols: ${normalizedSymbols.join(', ')}`);
  }

  // Store previous prices for percent change calculations
  const previousPrices = new Map(); // Map<symbol, price>

  /**
   * Broadcast price update to all subscribed clients
   */
  function broadcastPriceUpdate(priceData) {
    if (!priceData || !priceData.symbol) {
      logger.warn('Invalid priceData received for broadcast:', priceData);
      return;
    }

    const symbol = priceData.symbol.toUpperCase();
    const currentPrice = priceData.price || priceData.close || 0;
    const previousPrice = previousPrices.get(symbol) || null;

    // Update previous price
    if (currentPrice > 0) {
      previousPrices.set(symbol, currentPrice);
    }

    const message = JSON.stringify({
      type: 'price',
      symbol: symbol,
      price: currentPrice,
      open: priceData.open,
      high: priceData.high,
      low: priceData.low,
      close: priceData.close,
      volume: priceData.volume,
      priceChange: priceData.priceChange || 0,
      priceChangePercent: priceData.priceChangePercent || 0,
      timestamp: priceData.timestamp || new Date().toISOString(),
      sentAt: new Date().toISOString()
    });

    let broadcastCount = 0;
    let totalClients = 0;
    const subscribedSymbolsList = [];

    subscriptions.forEach((subscribedSymbols, ws) => {
      totalClients++;
      const symbols = Array.from(subscribedSymbols);
      subscribedSymbolsList.push(...symbols);
      
      if (ws.readyState === WebSocket.OPEN && subscribedSymbols.has(symbol)) {
        try {
          ws.send(message);
          broadcastCount++;
        } catch (error) {
          logger.error(`Error sending price update to client:`, error);
          subscriptions.delete(ws);
        }
      }
    });

    if (broadcastCount > 0) {
      logger.info(`✅ Broadcasted ${symbol} price $${currentPrice} to ${broadcastCount}/${totalClients} clients`);
    } else if (totalClients > 0) {
      // Only log warning once per symbol every 60 seconds to avoid spam
      const now = Date.now();
      const lastWarning = noSubscriberWarnings.get(symbol) || 0;
      if (now - lastWarning > 60000) {
        noSubscriberWarnings.set(symbol, now);
        logger.warn(`⚠️  No clients subscribed to ${symbol} (${totalClients} clients, their subs: ${[...new Set(subscribedSymbolsList)].slice(0, 5).join(', ')}...)`);
      }
    }
  }

  // Connect to Binance price updates
  if (onPriceUpdate) {
    onPriceUpdate(broadcastPriceUpdate);
  }

  return {
    broadcastPriceUpdate
  };
};

