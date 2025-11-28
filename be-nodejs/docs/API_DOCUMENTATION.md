# API Documentation - Crypto Community Platform

## Base URL
- **Development**: `http://localhost:3000/api`
- **Production**: TBD

## Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": { ... }
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error message"
}
```

---

## Market Data Endpoints

### 1. Market Overview
**GET** `/api/market/overview`

Get overall market statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalPairs": 2500,
    "totalVolume24h": 150000000000,
    "totalTrades24h": 50000000,
    "activeQuotes": ["USDT", "BUSD", "BTC", "ETH"]
  }
}
```

---

### 2. Top Coins
**GET** `/api/market/top`

Get top coins by volume, market cap, or other criteria.

**Query Parameters:**
- `limit` (number, optional): Number of coins to return (default: 10)
- `sortBy` (string, optional): Sort criteria - `volume`, `count`, `gainers`, `losers` (default: `volume`)
- `quote` (string, optional): Filter by quote asset (e.g., `USDT`, `BTC`)

**Example:**
```
GET /api/market/top?limit=20&sortBy=volume&quote=USDT
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "symbol": "BTCUSDT",
      "baseAsset": "BTC",
      "quoteAsset": "USDT",
      "price": 50000.00,
      "priceChangePercent": 2.5,
      "volume": 1000000000,
      "quoteVolume": 50000000000,
      "count": 150000,
      "listDate": "2020-01-01T00:00:00Z"
    }
  ]
}
```

---

### 3. Trending Coins
**GET** `/api/market/trending`

Get trending coins based on price change and volume.

**Query Parameters:**
- `limit` (number, optional): Number of coins (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [ ... ]
  }
}
```

---

### 4. New Listings
**GET** `/api/market/new`

Get recently listed coins.

**Query Parameters:**
- `limit` (number, optional): Number of coins (default: 10)
- `days` (number, optional): Lookback period in days (default: 7)

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [ ... ]
  }
}
```

---

### 5. Top Losers
**GET** `/api/market/losers`

Get coins with biggest price drops.

**Query Parameters:**
- `limit` (number, optional): Number of coins (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [ ... ]
  }
}
```

---

### 6. Market List (Paginated)
**GET** `/api/market/list`

Get paginated list of all market pairs.

**Query Parameters:**
- `page` (number, optional): Page number (0-indexed, default: 0)
- `size` (number, optional): Items per page (default: 20)
- `sortBy` (string, optional): Sort criteria (default: `volume`)
- `quote` (string, optional): Filter by quote asset

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "pagination": {
      "page": 0,
      "limit": 20,
      "total": 2500,
      "pages": 125
    }
  }
}
```

---

### 7. Quote Assets
**GET** `/api/market/quotes`

Get list of available quote assets.

**Response:**
```json
{
  "success": true,
  "data": ["USDT", "BUSD", "BTC", "ETH", "BNB"]
}
```

---

### 8. Ticker Details
**GET** `/api/market/ticker/:symbol`

Get 24h ticker statistics for a specific symbol.

**Example:**
```
GET /api/market/ticker/BTCUSDT
```

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "BTCUSDT",
    "price": 50000.00,
    "open": 49000.00,
    "high": 51000.00,
    "low": 48500.00,
    "close": 50000.00,
    "volume": 1000.5,
    "quoteVolume": 50000000,
    "priceChange": 1000.00,
    "priceChangePercent": 2.04,
    "count": 150000,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

---

### 9. Klines (Candlestick Data)
**GET** `/api/market/klines`

Get historical candlestick data.

**Query Parameters:**
- `symbol` (string, required): Trading pair (e.g., `BTCUSDT`)
- `interval` (string, optional): Time interval - `1m`, `5m`, `15m`, `1h`, `4h`, `1d`, etc. (default: `1h`)
- `limit` (number, optional): Number of klines (default: 100, max: 1000)
- `startTime` (number, optional): Start time in milliseconds
- `endTime` (number, optional): End time in milliseconds

**Example:**
```
GET /api/market/klines?symbol=BTCUSDT&interval=1h&limit=100
```

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "BTCUSDT",
    "interval": "1h",
    "klines": [
      {
        "openTime": 1704067200000,
        "open": 50000.00,
        "high": 50500.00,
        "low": 49500.00,
        "close": 50200.00,
        "volume": 1000.5,
        "closeTime": 1704070800000,
        "quoteVolume": 50000000,
        "trades": 1500,
        "takerBuyBaseVolume": 500.25,
        "takerBuyQuoteVolume": 25000000
      }
    ],
    "count": 100
  }
}
```

---

## WebSocket Endpoints

### Price Stream
**WebSocket** `ws://localhost:3000/ws/prices`

Real-time price updates from Binance.

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:3000/ws/prices?token=YOUR_JWT_TOKEN');
```

**Subscribe to symbols:**
```json
{
  "action": "subscribe",
  "symbols": ["BTCUSDT", "ETHUSDT"]
}
```

**Unsubscribe:**
```json
{
  "action": "unsubscribe",
  "symbols": ["BTCUSDT"]
}
```

**Ping:**
```json
{
  "action": "ping"
}
```

**Message Types:**

1. **Connected:**
```json
{
  "type": "connected",
  "message": "Connected to Crypto Community Platform Price Stream",
  "timestamp": "2024-01-15T10:30:00Z",
  "authenticated": true
}
```

2. **Price Update:**
```json
{
  "type": "price",
  "symbol": "BTCUSDT",
  "price": 50000.00,
  "open": 49000.00,
  "high": 51000.00,
  "low": 48500.00,
  "close": 50000.00,
  "volume": 1000.5,
  "priceChange": 1000.00,
  "priceChangePercent": 2.04,
  "timestamp": "2024-01-15T10:30:00Z",
  "sentAt": "2024-01-15T10:30:01Z"
}
```

3. **Subscribed:**
```json
{
  "type": "subscribed",
  "symbols": ["BTCUSDT", "ETHUSDT"],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

4. **Error:**
```json
{
  "type": "error",
  "message": "Invalid symbols array"
}
```

---

## Rate Limiting

- **General API**: 100 requests per 15 minutes per IP
- **Auth endpoints**: 5 requests per 15 minutes per IP
- **Blog creation**: 10 requests per hour per IP

Rate limit headers:
- `X-RateLimit-Limit`: Maximum requests
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time (seconds)

---

## Error Codes

- `400`: Bad Request - Invalid parameters
- `401`: Unauthorized - Missing or invalid token
- `404`: Not Found - Resource not found
- `429`: Too Many Requests - Rate limit exceeded
- `500`: Internal Server Error - Server error

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- All prices are in USD (USDT)
- Symbols are case-insensitive (will be normalized to uppercase)
- WebSocket connections auto-reconnect on disconnect
- Maximum 25 symbols per WebSocket connection

