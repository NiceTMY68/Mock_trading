# Setup Hoàn Tất - PostgreSQL, Binance WebSocket, NewsAPI

## ✅ Đã Setup

### 1. PostgreSQL Connection
- **File**: `src/config/database.js`
- **Features**:
  - Connection pooling với pg library
  - Async/await support
  - Error handling và auto-reconnect
  - Health check integration

**Usage**:
```javascript
import { getDatabase } from './config/database.js';
const db = getDatabase();
const result = await db.query('SELECT * FROM users');
```

### 2. Binance WebSocket Client
- **File**: `src/services/binanceWebSocket.js`
- **Features**:
  - Real-time price streaming từ Binance
  - Auto-reconnect với exponential backoff
  - Subscription management (subscribe/unsubscribe symbols)
  - Price caching trong memory và Redis
  - Broadcast price updates đến WebSocket clients

**Default Symbols**: BTCUSDT, ETHUSDT, BNBUSDT, SOLUSDT, ADAUSDT

**Usage**:
```javascript
import { getBinanceWebSocket } from './services/binanceWebSocket.js';
const ws = getBinanceWebSocket();
const price = ws.getLatestPrice('BTCUSDT');
```

### 3. Binance REST API Service
- **File**: `src/services/binanceService.js`
- **Endpoints**:
  - `getSymbols()` - Lấy danh sách trading pairs
  - `getTicker24hr(symbol)` - 24h ticker statistics
  - `getKlines(symbol, interval, limit)` - Candlestick data
  - `getLatestPrice(symbol)` - Latest price (từ cache hoặc API)

**Features**:
  - Redis caching cho tất cả endpoints
  - TTL: Symbols (1h), Ticker (30s), Klines (5m)
  - Error handling và fallback

### 4. NewsAPI Service
- **File**: `src/services/newsService.js`
- **Features**:
  - Fetch crypto news từ NewsData.io
  - Search news by keyword
  - Redis caching (15 minutes TTL)
  - Pagination support

**Usage**:
```javascript
import { getNewsService } from './services/newsService.js';
const newsService = getNewsService();
const news = await newsService.getCryptoNews({ page: 1, size: 10 });
```

### 5. WebSocket Price Streaming
- **File**: `src/websocket/priceStream.js`
- **Features**:
  - WebSocket server tại `/ws/prices`
  - Subscription management per connection
  - JWT authentication (optional)
  - Broadcast price updates từ Binance
  - Max 25 symbols per connection

**Client Usage**:
```javascript
const ws = new WebSocket('ws://localhost:3000/ws/prices?token=YOUR_JWT_TOKEN');

// Subscribe to symbols
ws.send(JSON.stringify({
  action: 'subscribe',
  symbols: ['BTCUSDT', 'ETHUSDT']
}));

// Receive price updates
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'price') {
    console.log(`${data.symbol}: $${data.price}`);
  }
};
```

## 📡 API Endpoints

### Market Data
- `GET /api/market/symbols` - Get all trading symbols
- `GET /api/market/ticker/:symbol` - Get 24hr ticker
- `GET /api/market/klines?symbol=BTCUSDT&interval=1h&limit=100` - Get candlestick data
- `GET /api/market/price/:symbol` - Get latest price
- `GET /api/market/ws/status` - Get WebSocket connection status

### News
- `GET /api/news` - Get crypto news (query: `page`, `size`, `language`, `category`, `country`)
- `GET /api/news/search?q=bitcoin` - Search news by keyword
- `GET /api/news/category/:category` - Get news by category

### Health Check
- `GET /health` - Check service health (database, redis status)

## 🔧 Environment Variables

Cần thiết lập trong `.env`:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crypto_community
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# External APIs
BINANCE_API_URL=https://api.binance.com/api/v3
NEWS_API_KEY=your_news_api_key
NEWS_API_URL=https://newsdata.io/api/1

# JWT (for WebSocket auth)
JWT_SECRET=your_jwt_secret_key
```

## 🚀 Chạy Server

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Server sẽ chạy tại http://localhost:3000
# WebSocket tại ws://localhost:3000/ws/prices
```

## 📝 Notes

1. **Binance WebSocket**: Tự động kết nối khi server start với default symbols
2. **Redis Caching**: Tất cả API calls đều được cache để giảm external API calls
3. **Error Handling**: Services có error handling và fallback mechanisms
4. **Health Check**: `/health` endpoint kiểm tra database và Redis connections

## 🔄 Next Steps

1. Tạo database schema (migrations)
2. Implement authentication endpoints
3. Implement blog system
4. Add database models cho price snapshots, news cache, etc.

