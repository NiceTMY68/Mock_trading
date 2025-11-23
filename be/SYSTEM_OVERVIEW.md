# Crypto Mock Trading Platform - System Overview

## Mục đích
Tài liệu này tóm tắt toàn bộ chức năng, logic xử lý và thuật toán của backend, giúp đánh giá độ phù hợp với dự án mà không cần đọc chi tiết source code.

---

## 1. Tổng quan hệ thống

### 1.1 Mục tiêu
Nền tảng mock trading cryptocurrency với:
- Real-time market data streaming từ Binance
- Mock trading (market/limit orders)
- Backtesting engine cho trading strategies
- Portfolio management và analytics
- Subscription-based feature gating
- News aggregation từ NewsData.io

### 1.2 Tech Stack
- **Framework**: Spring Boot 3.5.6 (Java 17)
- **Database**: PostgreSQL 15 với Flyway migrations
- **Cache**: Redis 7 (rate limiting, data caching)
- **Security**: JWT authentication, Spring Security
- **WebSocket**: Spring WebSocket cho real-time streaming
- **External APIs**: Binance REST/WebSocket, NewsData.io, Stripe

### 1.3 Kiến trúc tổng quan
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Client    │────▶│  Spring Boot │────▶│ PostgreSQL  │
│  (Frontend) │     │   Backend    │     │  Database   │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ├──▶ Redis (Cache + Rate Limiting)
                           │
                           ├──▶ Binance API (Market Data)
                           │
                           ├──▶ NewsData.io (News)
                           │
                           └──▶ Stripe (Billing)
```

---

## 2. Các chức năng chính

### 2.1 Authentication & Authorization
**Endpoints**: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`

**Logic**:
- Đăng ký: Hash password bằng BCrypt, tạo user với `virtualBalance = 10000 USDT`
- Đăng nhập: Verify password, generate JWT token (expires sau 24h)
- Tất cả endpoints (trừ auth) yêu cầu JWT trong header `Authorization: Bearer <token>`
- JWT chứa: `userId`, `email`, `roles`

### 2.2 Market Data Proxy (Binance)
**Endpoints**: 
- `GET /api/v1/market/symbols` - Danh sách trading pairs
- `GET /api/v1/market/klines` - Historical candlestick data
- `GET /api/v1/market/ticker24hr` - 24h ticker statistics

**Logic**:
- Proxy requests đến Binance REST API
- Cache responses trong Redis với TTL (ví dụ: symbols cache 1h, klines cache 5 phút)
- Trả về response kèm metadata: `requestId`, `provider: "binance"`, `cached: true/false`
- Premium users có thể query extended date ranges

**Parameter Validation & Normalization**:
- **Whitelist Intervals**: `1m`, `5m`, `15m`, `1h`, `4h`, `1d` (config: `app.kline.valid-intervals`)
- **Limit Caps per Plan**:
  - Free: max 200 (`app.kline.max-limit.free=200`)
  - Pro: max 1000 (`app.kline.max-limit.pro=1000`)
  - Default: 100 nếu không specify
- **Date Range Limits**:
  - Free: max 30 days (`app.kline.max-range-days.free=30`)
  - Pro: max 365 days (`app.kline.max-range-days.pro=365`)
- **Symbol Validation**: 2-20 uppercase alphanumeric characters (regex: `^[A-Z0-9]{2,20}$`)
- **Normalization**:
  - Symbol → uppercase
  - Interval → lowercase
  - Timestamps → epoch milliseconds (supports epoch seconds, epoch ms, ISO 8601)

**Caching Strategy**:
- Cache key format: `binance:klines:{symbol}:{interval}:{startTime}:{endTime}:{limit}`
- TTL: 5 phút cho klines, 1 giờ cho symbols
- Cache miss → call Binance → store in Redis → return

### 2.3 Real-time Price Streaming (WebSocket)
**Endpoint**: `ws://localhost:8080/ws/prices`

**Authentication**: JWT trong header `Authorization: Bearer <token>` hoặc query param `?token=<jwt>`

**Logic**:
1. **Connection**: 
   - Client connect → Server authenticate JWT → Check subscription plan → Enable streaming nếu Pro
   - Server gửi `connected` event với `streamingEnabled: true`, `premium: true/false`
2. **Subscription**: Client gửi `{"action": "subscribe", "symbols": ["BTCUSDT", "ETHUSDT"]}`
   - Validate số lượng symbols (Free: max 5, Pro: max 25)
   - Rate limiting: Check subscription change rate limit (token bucket)
   - Normalize symbols: uppercase, trim, distinct
   - Add session vào subscription map
   - Server response: `{"type": "subscribed", "symbols": ["BTCUSDT", "ETHUSDT"], "sentAt": "..."}`
3. **Unsubscribe**: Client gửi `{"action": "unsubscribe", "symbols": ["BTCUSDT"]}`
   - Server response: `{"type": "unsubscribed", "symbols": ["BTCUSDT"], "sentAt": "..."}`
4. **Ping/Pong**: Client gửi `{"action": "ping"}` → Server response `{"type": "pong", "timestamp": "..."}`
5. **Publishing**: Khi có price update từ Binance WebSocket:
   - `PriceService` persist snapshot vào DB
   - `PriceWebSocketService` broadcast đến tất cả subscribers của symbol đó
6. **Rate Limiting**: Token bucket algorithm cho subscription changes (Pro: 300 req/min, Free: 60 req/min)
   - Redis keys: `ws:subs:{userId}:tokens`, `ws:subs:{userId}:last_refill`
   - Expiry: 2 phút
   - Fail-open: Nếu Redis error → Allow request

**Message Format**:
- **Connected Event**:
```json
{
  "type": "connected",
  "streamingEnabled": true,
  "premium": true,
  "timestamp": "2024-01-15T10:30:00Z",
  "sentAt": "2024-01-15T10:30:00Z"
}
```

- **Price Update**:
```json
{
  "type": "price",
  "symbol": "BTCUSDT",
  "open": 52000.00,
  "high": 52300.00,
  "low": 51850.00,
  "close": 52150.00,
  "volume": 123.45,
  "timestamp": "2024-01-15T10:30:00Z",
  "sentAt": "2024-01-15T10:30:01Z"
}
```

- **Error Event**:
```json
{
  "type": "error",
  "code": "rate_limited",
  "message": "Too many subscription changes",
  "sentAt": "2024-01-15T10:30:00Z"
}
```

### 2.4 Mock Trading
**Endpoints**: 
- `POST /api/orders` - Place order (market/limit) - **Requires premium subscription** (feature: `trading`)
- `GET /api/orders` - List user orders (pagination: `page`, `size`) - **Status: Partially implemented**
- `GET /api/orders/{orderId}` - Get order details - **Status: Placeholder (to be implemented)**
- `PATCH /api/orders/{orderId}/cancel` - Cancel pending order - **Requires premium subscription**
- `GET /api/orders/portfolio` - Portfolio summary - **Status: Placeholder (to be implemented)**
- `GET /api/orders/holdings` - Current holdings - **Status: Placeholder (to be implemented)**

**Order Types**:
- **Market Order**: Execute ngay lập tức với giá hiện tại
- **Limit Order**: Chờ giá đạt threshold mới execute

**Logic xử lý Market Order**:
1. Validate order (quantity > 0, symbol exists)
2. Lấy latest price từ `PriceService`
3. Tính toán:
   - `totalAmount = quantity × price`
   - `commission = totalAmount × 0.1%`
   - `totalCost = totalAmount + commission`
4. **BUY Order**:
   - Check `portfolio.virtualBalance >= totalCost`
   - Trừ balance, tạo `Order` (status: FILLED), tạo `Trade`
   - Update `Holding` (nếu chưa có thì tạo mới, nếu có thì update average cost)
   - Update `Portfolio` (totalInvested, totalMarketValue, PnL)
5. **SELL Order**:
   - Check `holding.quantity >= order.quantity`
   - Cộng balance, tạo `Order` và `Trade`
   - Update `Holding` (trừ quantity, update average cost theo FIFO)
   - Update `Portfolio`

**Logic xử lý Limit Order**:
1. Tạo `Order` với status `PENDING`
2. Background job (`processPendingLimitOrders`) chạy định kỳ:
   - Lấy tất cả PENDING orders
   - Với mỗi order:
     - **BUY limit**: Fill nếu `currentPrice <= order.price`
     - **SELL limit**: Fill nếu `currentPrice >= order.price`
   - Khi fill: Update order status → FILLED, tạo Trade, update Holdings/Portfolio

**Portfolio Calculation**:
- `totalMarketValue = sum(holding.quantity × currentPrice)` cho tất cả holdings
- `totalPnl = totalMarketValue + virtualBalance - 10000` (initial balance)
- `totalPnlPercentage = (totalPnl / totalInvested) × 100`

### 2.5 Backtesting Engine
**Endpoint**: `POST /api/backtest`

**Input**:
```json
{
  "symbol": "BTCUSDT",
  "start": "2024-01-01T00:00:00Z",
  "end": "2024-01-31T23:59:59Z",
  "strategy": {
    "fast": 20,
    "slow": 50
  }
}
```

**Thuật toán SMA Crossover**:
1. **Load Data**: Query `PriceSnapshot` trong date range, sort theo timestamp
2. **Validation**: 
   - Date range ≤ 365 days
   - Data points ≤ 10,000
   - Số snapshots ≥ max(fast, slow) periods
3. **Calculate SMAs**:
   - Với mỗi snapshot tại index `i`:
     - `SMA_fast[i] = average(close[i-fast+1] ... close[i])` nếu `i >= fast-1`
     - `SMA_slow[i] = average(close[i-slow+1] ... close[i])` nếu `i >= slow-1`
4. **Simulate Trades**:
   - Initial balance: 10,000 USDT
   - Duyệt qua price data:
     - **Entry Signal**: `SMA_fast` cắt lên trên `SMA_slow` (golden cross)
       - Mua toàn bộ balance: `holdings = cash / currentPrice`
       - Lưu entry price và entry value
     - **Exit Signal**: `SMA_fast` cắt xuống dưới `SMA_slow` (death cross)
       - Bán toàn bộ holdings: `cash = holdings × currentPrice`
       - Tính PnL: `pnl = cash - entryValue`
       - Lưu trade vào list
   - Nếu còn position ở cuối: Force close với giá cuối cùng
5. **Calculate Metrics**:
   - `netReturn = finalBalance - initialBalance`
   - `returnPercent = (netReturn / initialBalance) × 100`
   - `winRate = (winningTrades / totalTrades) × 100`
   - `maxDrawdown`: Duyệt equity curve, tìm max drawdown từ peak
     ```
     maxDrawdown = max((peak - equity) / peak × 100)
     ```
6. **Persist**: Lưu `Backtest` entity với tất cả metrics

**Output**:
```json
{
  "backtestId": "uuid",
  "symbol": "BTCUSDT",
  "initialBalance": 10000,
  "finalBalance": 12500,
  "netReturn": 2500,
  "returnPercent": 25.0,
  "winRate": 65.5,
  "totalTrades": 20,
  "winningTrades": 13,
  "maxDrawdown": 8.5,
  "dataPoints": 720
}
```

### 2.6 Price Alerts
**Endpoints**: 
- `POST /api/alerts` - Create alert
- `GET /api/alerts` - List alerts
- `DELETE /api/alerts/{id}` - Delete alert

**Logic**:
- User tạo alert với: `symbol`, `direction` (ABOVE/BELOW), `threshold`
- Background job (`processActiveAlerts`) chạy định kỳ:
  - Lấy tất cả active alerts
  - Với mỗi alert: Lấy latest price → Check condition:
    - `ABOVE`: `price >= threshold`
    - `BELOW`: `price <= threshold`
  - Nếu trigger: Set `active = false`, `triggeredAt = now()`, tạo notification

### 2.7 Watchlist
**Endpoints**: 
- `GET /api/watchlist` - Get user watchlist
- `POST /api/watchlist/items` - Add symbol
- `DELETE /api/watchlist/items/{id}` - Remove symbol

**Logic**: Simple CRUD, mỗi user có 1 watchlist, mỗi watchlist có nhiều items (symbols)

### 2.8 News Aggregation
**Endpoint**: `GET /api/news/crypto`

**Logic**:
- Proxy đến NewsData.io API
- Cache responses (TTL: 15 phút)
- Premium feature: Chỉ Pro users mới access được
- Track usage: Ghi `UsageMetric` mỗi lần call API (để cost control)

**Usage Metrics**:
- Metric keys: `news.api.calls`, `news.api.articles`
- Store: `UsageMetric` entity với `metricKey`, `userId`, `amount`, `metadata`, `createdAt`
- Tracking: Increment metric mỗi lần call NewsData.io API

### 2.9 Subscription & Billing
**Endpoints**: 
- `POST /api/billing/subscribe` - Subscribe to plan
- `GET /api/billing/subscription` - Get current subscription
- `POST /api/webhooks/stripe` - Stripe webhook handler

**Logic**:
- Integration với Stripe:
  - User chọn plan → Tạo Stripe Checkout session → Redirect user
  - Stripe webhook: Xử lý `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
  - Tạo/update `Subscription` entity trong DB
- Feature gating: `FeatureFlagService` check subscription status trước khi enable features

**Stripe Flow Specifics**:
- **Checkout Session Creation**:
  - Metadata: `userId`, `planId`
  - Success/Cancel URLs: Configurable hoặc default (`{baseUrl}/billing/success`)
  - Price ID mapping: `planId` → Stripe Price ID
    - `"pro"` → `"price_pro_monthly"`
    - `"premium"` → `"price_premium_monthly"`
- **Webhook Signature Verification**:
  - Verify `Stripe-Signature` header với `stripe.webhook-secret`
  - Sử dụng `Webhook.constructEvent(payload, sigHeader, webhookSecret)`
  - Throw `SignatureVerificationException` nếu invalid → return 400
- **DB Fields for Stripe**:
  - `stripe_customer_id` (VARCHAR 100) - Stripe customer ID
  - `stripe_subscription_id` (VARCHAR 100) - Stripe subscription ID
  - `plan_id` (VARCHAR 50) - Plan identifier: "pro", "premium", etc.
  - `status` (VARCHAR 30) - Subscription status: ACTIVE, CANCELED, PAST_DUE, etc.
  - `current_period_end` (TIMESTAMPTZ) - Subscription period end date
- **Plan ID → Feature Flags Mapping**:
  - Premium features require `isPremium = true` trong subscription
  - Feature flags: `streaming_data`, `backtesting`, `ai_analysis`, `advanced_charts`, `historical_data`, `real_time_alerts`, `portfolio_analytics`
  - All premium features enabled for Pro/Premium plans

**Subscription Tiers**:
- **Free**: Basic rate limits (60 req/min), no streaming, no backtesting, no news
- **Pro**: Streaming (25 symbols), backtesting, news access, higher rate limits (300 req/min)

---

## 3. Thuật toán và Logic xử lý

### 3.1 Rate Limiting (Token Bucket Algorithm)
**Implementation**: `RateLimitInterceptor` (REST) và `PriceWebSocketService` (WebSocket)

**Thuật toán**:
1. Mỗi user có một "bucket" chứa tokens
2. Bucket có:
   - `bucketSize`: Số tokens tối đa (ví dụ: 100)
   - `refillRate`: Tokens refill mỗi giây (ví dụ: 2 tokens/sec)
3. Khi có request:
   - Tính tokens cần refill: `tokensToAdd = (now - lastRefillTime) × refillRate`
   - Refill: `currentTokens = min(currentTokens + tokensToAdd, bucketSize)`
   - Nếu `currentTokens >= 1`: Consume 1 token, allow request
   - Nếu `currentTokens < 1`: Reject request (429 Too Many Requests)
4. Store trong Redis với key naming:
   - REST: `rate_limit:{userIdentifier}:tokens`, `rate_limit:{userIdentifier}:last_refill`
   - WebSocket: `ws:subs:{userId}:tokens`, `ws:subs:{userId}:last_refill`
   - `userIdentifier`: Email (authenticated) hoặc `anon:{IP}` (anonymous)

**Redis Key Expiry Policy**:
- Keys expire sau 2 phút (`TimeUnit.MINUTES`, value: 2)
- Tự động cleanup khi không có activity

**Response Headers** (REST only):
- `X-RateLimit-Limit`: Maximum requests per minute
- `X-RateLimit-Remaining`: Remaining tokens (floored)
- `X-RateLimit-Reset`: Reset time in seconds
- `Retry-After`: 60 (khi rate limit exceeded)

**Error Response** (429 Too Many Requests):
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Maximum 60 requests per minute allowed.",
  "retryAfter": 60,
  "limit": 60,
  "remaining": 0
}
```

**Fail-Open Behavior**:
- Nếu Redis connection error hoặc timeout:
  - Log error: `"Error checking rate limit for {}: {}"`
  - **Allow request** (return `true`) - Fail-open strategy
  - Tránh service outage khi Redis down
- Tương tự cho WebSocket rate limiting: catch exception → return `true`

**Rate Limits**:
- **ANONYMOUS**: 20 req/min (bucket: 40, refill: 0.33/sec) - Config: `rate-limit.anonymous.requests-per-minute=20`
- **USER** (Free): 60 req/min (bucket: 120, refill: 1/sec) - Config: `rate-limit.free.requests-per-minute=60`
- **PRO**: 300 req/min (bucket: 600, refill: 5/sec) - Config: `rate-limit.pro.requests-per-minute=300`
- Bucket size = requests-per-minute × `rate-limit.bucket-size-multiplier` (default: 2)

### 3.2 Feature Flag Service
**Implementation**: `FeatureFlagService`

**Feature Keys**:
- `streaming_data` - Real-time WebSocket streaming
- `backtesting` - Backtesting engine
- `ai_analysis` - AI-powered analysis
- `advanced_charts` - Advanced charting features
- `historical_data` - Extended historical data access
- `real_time_alerts` - Real-time price alerts
- `portfolio_analytics` - Portfolio analytics
- `trading` - Mock trading (market/limit orders) - **NEW**
- `api_rate_limits` - Higher API rate limits

**Logic**:
- Check user có active subscription không
- Nếu feature là "premium" → Check subscription có `isPremium = true` không
- Premium features: Tất cả features trên đều là premium (require `isPremium = true`)
- Fail-safe: Nếu error → return `false` (disable feature)

### 3.3 Caching Strategy
**Implementation**: `CacheService` + `CacheKeyUtil`

**Cache Key Format & Normalization Rules**:
- **Format**: `{prefix}:{type}:{params}`
- **Normalization**:
  - Symbols: Uppercase (`BTCUSDT`)
  - Intervals: Lowercase (`1h`, `5m`)
  - Timestamps: Epoch milliseconds (null → "null")
  - Dates: ISO format, remove special chars (`20240115T103000Z`)
  - Query strings: Lowercase, replace spaces with underscores

**Cache Keys**:
- Binance REST: `binance:klines:{symbol}:{interval}:{startTime}:{endTime}:{limit}`
  - Example: `binance:klines:BTCUSDT:1h:1704067200000:1704153600000:100`
- Binance WebSocket: 
  - `binance:kline:{symbol}:{interval}` (lowercase symbol)
  - `binance:price:{symbol}` (lowercase symbol)
  - `binance:trade:{symbol}` (lowercase symbol)
  - `binance:depth:{symbol}` (lowercase symbol)
- News: `news:{query}:{fromDate}:{toDate}:page={page}`
  - Example: `news:crypto:20240115T000000Z:20240116T000000Z:page=1`
- Symbols: `binance:symbols:all`
- Ticker: `binance:ticker:{symbol}`

**TTL**:
- Klines (REST): 5 phút (`DEFAULT_TTL`)
- Klines (WebSocket): 1 phút (`KLINE_TTL`)
- Ticker: 30 giây (`TICKER_TTL`)
- Symbols: 1 giờ (`SYMBOL_INFO_TTL`)
- News: 15 phút (`NEWS_TTL`)
- Market data (WebSocket): 5 phút (`MARKET_DATA_TTL`)

**Cache Invalidation Policy**:
- TTL-based expiration (Redis tự động xóa khi hết TTL)
- Không có manual invalidation (cache warming strategy: chưa có)
- Cache miss → call external API → store in Redis → return

### 3.4 Order Matching (Limit Orders)
**Implementation**: `OrderService.processPendingLimitOrders()`

**Logic**:
- Background job chạy định kỳ (ví dụ: mỗi 5 giây)
- Lấy tất cả PENDING orders, sort theo `createdAt ASC` (FIFO)
- Với mỗi order:
  - **BUY limit**: Fill nếu `currentPrice <= order.price`
  - **SELL limit**: Fill nếu `currentPrice >= order.price`
- Khi fill: Update order → FILLED, tạo Trade, update Holdings/Portfolio

### 3.5 Portfolio Valuation
**Implementation**: `OrderService.updatePortfolioValues()`

**Logic**:
- `totalMarketValue = sum(holding.quantity × currentPrice)` cho tất cả holdings
- `totalPnl = totalMarketValue + virtualBalance - 10000`
- `totalPnlPercentage = (totalPnl / totalInvested) × 100` (nếu totalInvested > 0)

### 3.6 Holding Average Cost (FIFO)
**Implementation**: `OrderService.updateExistingHolding()`

**Logic**:
- **BUY**: 
  - `newQuantity = oldQuantity + orderQuantity`
  - `newTotalCost = oldTotalCost + (orderQuantity × price) + commission`
  - `newAverageCost = newTotalCost / newQuantity`
- **SELL**:
  - `newQuantity = oldQuantity - orderQuantity`
  - `costReduction = oldTotalCost × (orderQuantity / oldQuantity)` (FIFO)
  - `newTotalCost = oldTotalCost - costReduction`
  - `newAverageCost = newTotalCost / newQuantity` (nếu newQuantity > 0)

---

## 4. Data Flow

### 4.1 Market Data Flow
```
Binance WebSocket → BinanceWebSocketClient → BinanceMessageHandler 
  → PriceService.persistKlineData() 
    → PriceSnapshotRepository (DB)
    → PriceWebSocketService.publishSnapshot() 
      → Broadcast to WebSocket subscribers
```

### 4.2 Order Placement Flow
```
Client → OrderController.placeOrder() 
  → OrderService.placeMarketOrder()
    → Validate order
    → Get latest price (PriceService)
    → Validate funds/holdings
    → Create Order (FILLED)
    → Create Trade
    → Update Holdings (FIFO average cost)
    → Update Portfolio (PnL calculation)
    → Return OrderResponse
```

### 4.3 Backtest Flow
```
Client → BacktestController.runBacktest()
  → BacktestService.runBacktest()
    → Load PriceSnapshots (date range)
    → Calculate SMAs (fast, slow)
    → Simulate trades (crossover signals)
    → Calculate metrics (return, win rate, drawdown)
    → Persist Backtest entity
    → Return BacktestResult
```

---

## 5. Database Schema (Core Entities)

### 5.1 User & Authentication
- **User**: `id`, `email`, `password` (BCrypt), `fullName`, `virtualBalance` (default: 10000)
- **Subscription**: `userId`, `planId`, `stripeSubscriptionId`, `status`, `startDate`, `endDate`, `isPremium`

### 5.2 Trading
- **Order**: `orderId` (UUID), `userId`, `symbol`, `side` (BUY/SELL), `type` (MARKET/LIMIT), `quantity`, `price`, `status` (PENDING/FILLED/CANCELLED), `filledQuantity`, `averagePrice`, `totalAmount`, `commission`
- **Trade**: `orderId`, `userId`, `symbol`, `side`, `quantity`, `price`, `totalAmount`, `commission`, `executedAt`
- **Holding**: `userId`, `symbol`, `quantity`, `averageCost`, `totalCost`, `marketValue`, `unrealizedPnl`
- **Portfolio**: `userId`, `virtualBalance`, `totalInvested`, `totalMarketValue`, `totalPnl`, `totalPnlPercentage`

### 5.3 Market Data
- **PriceSnapshot**: `coinSymbol`, `timestamp`, `open`, `high`, `low`, `close`, `volume`, `rawMeta` (JSON)

### 5.4 Analytics
- **Backtest**: `userId`, `symbol`, `startTime`, `endTime`, `strategyType` (SMA_CROSSOVER), `strategyParams` (JSON), `initialBalance`, `finalBalance`, `netReturn`, `returnPercent`, `winRate`, `totalTrades`, `winningTrades`, `maxDrawdown`, `dataPoints`
- **UsageMetric**: `userId`, `metricKey` (news_api_calls, news_articles), `amount`, `timestamp`

### 5.5 User Features
- **Alert**: `userId`, `symbol`, `direction` (ABOVE/BELOW), `threshold`, `active`, `triggeredAt`
- **Watchlist**: `userId` (one-to-one)
- **WatchlistItem**: `watchlistId`, `symbol`, `addedAt`

### 5.6 Audit & Logging
- **RequestLog**: 
  - `id` (UUID, primary key)
  - `requestId` (UUID, unique) - Returned to client in response
  - `userId` (UUID, nullable) - User making the request
  - `endpoint` (String) - API endpoint path
  - `provider` (String, nullable) - Provider name: "binance", "newsdata", etc.
  - `normalizedParams` (JSONB) - Normalized request parameters (symbol uppercase, interval lowercase, timestamps as epoch ms)
  - `cached` (Boolean) - Whether response was served from cache
  - `latencyMs` (Long) - Request latency in milliseconds
  - `providerMeta` (JSONB) - Provider response metadata (includes provider request IDs, raw payloads for replay/defense)
  - `createdAt` (Timestamp) - Request timestamp
  
**Audit Behavior**:
- Mọi request quan trọng (market data, news, trading) đều được log với `requestId`
- `requestId` được return trong response: `{"success": true, "requestId": "uuid", "data": {...}}`
- `normalizedParams` lưu params đã được normalize (uppercase symbol, lowercase interval, epoch ms timestamps)
- `providerMeta` lưu metadata từ provider response (ví dụ: Binance request ID, raw response payload) để replay/defense
- Audit failure không làm break API (fail-safe)

---

## 6. Security

### 6.1 Authentication
- JWT tokens (HS256), expires 24h (config: `jwt.expiration=86400`)
- Password hashing: BCrypt (strength: 10)
- **Password Policy**:
  - Minimum length: 8 characters (`@Size(min = 8)`)
  - Validation: Jakarta Bean Validation (`@NotBlank`, `@Size`)
  - Complexity requirements: **Chưa có** (chỉ check length)
- **JWT Refresh Tokens**: **Chưa có** - Chỉ có access token, expires sau 24h
- **JWT Rotation**: **Chưa có** - Không có token rotation mechanism

### 6.2 Authorization
- Tất cả endpoints (trừ `/api/auth/**`, `/ws/**`) yêu cầu JWT
- Feature gating: Check subscription status trước khi enable features

### 6.3 Rate Limiting
- Token bucket algorithm với Redis
- Tier-based limits (Anonymous/User/Pro)

### 6.4 Security Headers
- CSRF protection (Cookie-based, disabled cho `/api/**`, `/ws/**`)
- CORS: Configurable origins (`security.allowed-origins`)
- HTTPS enforcement: Optional redirect HTTP → HTTPS (`security.require-ssl`)
- Security headers: CSP, Referrer Policy, Frame Options

### 6.5 Secrets Management
- JWT secret, DB credentials, API keys: Environment variables
- Request logging filter: Exclude headers/payloads (không log secrets)
- **Brute-Force Protection**: **Chưa có** - Không có account lockout hoặc rate limiting cho login attempts
- **PII Logging Rules**: **Chưa có** - Không có explicit rules về logging PII (email, fullName có thể xuất hiện trong logs)

---

## 7. External Integrations

### 7.1 Binance API
- **REST**: Market data (klines, symbols, ticker24hr)
- **WebSocket**: Real-time price streams (aggregated trades, klines)
- No API key required (public endpoints only)

### 7.2 NewsData.io
- REST API: Crypto news articles
- API key required (`NEWS_API_KEY`)
- Usage tracking: Ghi `UsageMetric` mỗi lần call

### 7.3 Stripe
- Checkout: Tạo subscription sessions
- Webhooks: Xử lý subscription events (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`)
- Secret key required (`STRIPE_SECRET_KEY`)

---

## 8. Performance & Scalability

### 8.1 Caching
- Redis caching cho Binance REST responses (giảm external API calls)
- Cache TTL: 5 phút (klines), 1 giờ (symbols), 15 phút (news)

### 8.2 Database
- Indexes trên: `user_id`, `symbol`, `timestamp`, `order_id`
- Flyway migrations cho schema versioning

### 8.3 Background Jobs
- **Limit Order Processing**: Chạy định kỳ mỗi 5 giây (config: `app.limit.matcher.delay=5000`)
  - Implementation: `LimitOrderMatcherScheduler`
  - Process pending limit orders, match với current price
- **Alert Processing**: Chạy định kỳ mỗi 60 giây (config: `app.alert.checker.delay=60000`)
  - Implementation: `AlertCheckerScheduler`
  - Check active alerts, trigger nếu price đạt threshold

### 8.4 Rate Limiting
- Token bucket algorithm với Redis (distributed rate limiting)
- Fail-open strategy: Nếu Redis down → Allow requests (tránh service outage)

---

## 9. Testing Strategy

### 9.1 Unit Tests
- Service layer: Business logic, algorithms (BacktestService, OrderService)
- Utility classes: ParamValidator, CacheKeyUtil

### 9.2 Integration Tests
- **Testcontainers**: PostgreSQL + Redis containers
- Order flow: Place order → Update holdings → Update portfolio
- Binance proxy: Mock Binance API với WireMock, test caching

### 9.3 CI/CD
**GitHub Actions Workflow** (`.github/workflows/ci.yml`):
- **Triggers**: Push/PR to `main` hoặc `develop` branches
- **Steps**:
  1. Checkout code
  2. Set up JDK 17 (Temurin distribution)
  3. Cache Maven packages
  4. Build with Maven (`./mvnw -B clean compile`)
  5. Run tests including Testcontainers (`./mvnw -B -DskipTests=false test`)
  6. Generate test report (display test results)
  7. Upload test results as artifact (retention: 7 days)
  8. Test summary in GitHub step summary
- **Environment**: `SPRING_PROFILES_ACTIVE=test`
- **Test Results**: Stored in `target/surefire-reports/`

---

## 10. Deployment

### 10.1 Docker
- Multi-stage build: Maven build → JRE runtime
- Non-root user: `spring:spring`
- Healthcheck: `/actuator/health/liveness`
- JVM tuning: G1GC, MaxRAMPercentage

**Actuator Configuration**:
- **Endpoints**: `health`, `info`, `metrics`, `prometheus`
- **Health Details**: `management.endpoint.health.show-details=never` (không show details, chỉ status)
- **Probes**: Liveness và Readiness probes enabled
- **Info**: App name, version, description từ `info.app.*` properties

### 10.2 Environment Variables & Configuration
**Database**:
- `DB_URL`, `DB_USER`, `DB_PASS`

**Redis**:
- `REDIS_HOST`, `REDIS_PORT`

**JWT**:
- `JWT_SECRET`

**External APIs**:
- `NEWS_API_KEY` (NewsData.io)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `APP_BASE_URL` (default: `http://localhost:8080`)

**Security**:
- `security.allowed-origins` (default: `https://localhost:3000`)
- `security.require-ssl` (default: `true`)

**Application Config**:
- `app.kline.valid-intervals` - Whitelist intervals (default: `1m,5m,15m,1h,4h,1d`)
- `app.kline.max-limit.free` - Max limit for free users (default: `200`)
- `app.kline.max-limit.pro` - Max limit for pro users (default: `1000`)
- `app.kline.max-range-days.free` - Max date range for free (default: `30`)
- `app.kline.max-range-days.pro` - Max date range for pro (default: `365`)
- `app.limit.matcher.delay` - Limit order matcher delay in ms (default: `5000`)
- `app.alert.checker.delay` - Alert checker delay in ms (default: `60000`)

**Rate Limiting**:
- `rate-limit.anonymous.requests-per-minute` (default: `20`)
- `rate-limit.free.requests-per-minute` (default: `60`)
- `rate-limit.pro.requests-per-minute` (default: `300`)
- `rate-limit.bucket-size-multiplier` (default: `2`)

**Cache TTL** (ISO-8601 Duration format):
- `cache.ttl.default` (default: `PT5M` = 5 minutes)
- `cache.ttl.klines` (default: `PT1M` = 1 minute)
- `cache.ttl.symbols` (default: `PT1H` = 1 hour)
- `cache.ttl.news` (default: `PT15M` = 15 minutes)
- `cache.ttl.ticker` (default: `PT30S` = 30 seconds)
- `cache.ttl.market-data` (default: `PT5M` = 5 minutes)

### 10.3 Database Migrations
- Flyway: Auto-migrate on startup
- Migration file: `V1__init.sql` (tạo tất cả tables)
- Location: `src/main/resources/db/migration/V1__init.sql`
- **Sample SQL Structure**:
  - Creates all tables: `users`, `subscriptions`, `request_logs`, `price_snapshots`, `portfolios`, `orders`, `trades`, `holdings`, `notifications`, `backtests`, `usage_metrics`, `watchlists`, `watchlist_items`, `alerts`
  - Creates indexes: `idx_subscriptions_user`, `idx_price_snapshots_symbol_time`, `idx_orders_user`, `idx_notifications_user`, `idx_usage_metrics_key`, `idx_usage_metrics_user`, `idx_alerts_user_symbol_active`
  - Uses PostgreSQL extensions: `pgcrypto` (for UUID generation)

---

## 11. API Documentation & OpenAPI

### 11.1 OpenAPI/Swagger Configuration
- **Library**: Springdoc OpenAPI (springdoc-openapi-starter-webmvc-ui)
- **Configuration**: `OpenApiConfig` bean
- **API Documentation Endpoints**:
  - Swagger UI: `http://localhost:8080/swagger-ui.html` (hoặc `/swagger-ui/index.html`)
  - OpenAPI JSON: `http://localhost:8080/v3/api-docs`
  - OpenAPI YAML: `http://localhost:8080/v3/api-docs.yaml`

### 11.2 API Info
- **Title**: "Crypto Mock Trading API"
- **Version**: "0.1.0"
- **Description**: API documentation for Crypto Mock Trading backend. Provides endpoints for authentication, market data proxy (Binance), news aggregation, mock trading, backtesting, alerts, and subscription management.
- **Server**: `http://localhost:8080` (Local development server)

### 11.3 Security Scheme
- **Type**: HTTP Bearer Authentication
- **Scheme**: `bearer`
- **Bearer Format**: JWT
- **Description**: JWT authentication token. Obtain via `/api/auth/login`

### 11.4 Response Format with requestId
**Standard Response Format**:
```json
{
  "success": true,
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "data": {
    // Response data
  }
}
```

**Error Response Format**:
```json
{
  "success": false,
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "error": "Error message"
}
```

**Note**: `requestId` được generate bởi `AuditLoggingHelper` và return trong mọi response để client có thể track/replay requests.

---

## 12. Monitoring & Cost Control

### 12.1 Usage Metrics
**Implementation**: `UsageService` + `UsageMetric` entity

**Metric Keys**:
- `news.api.calls` - Số lần gọi NewsData.io API
- `news.api.articles` - Số articles retrieved
- `binance.api.calls` - Số lần gọi Binance API

**Tracking Methods**:
- `increment(metricKey, userId, amount)` - Basic increment với string metadata
- `increment(metricKey, userId, amount, metadata)` - Increment với string metadata
- `incrementWithMetadata(metricKey, userId, amount, JsonNode metadata)` - **NEW**: Increment với JSON metadata
  - Metadata được serialize thành JSON string
  - Truncate nếu > 500 chars (giữ 497 chars + "...")

**Storage**:
- Store trong `usage_metrics` table với indexes: `idx_usage_metrics_key`, `idx_usage_metrics_user`
- Fields: `metricKey`, `userId`, `amount`, `metadata` (VARCHAR 500), `createdAt`

**Query Methods**:
- `getTotalUsage(metricKey, since)` - Tổng usage từ thời điểm `since`
- `getUserUsage(metricKey, userId, since)` - Usage của user cụ thể
- `getCallCount(metricKey, since)` - Số lần gọi API
- `getDailyStats(metricKey)` - Stats trong 24h (totalUsage, callCount, averagePerCall)
- `getUserDailyStats(metricKey, userId)` - User stats trong 24h
- `getTopUsers(metricKey, since)` - Top users by usage
- `getUserHistory(userId)` - Usage history của user
- `getMetricHistory(metricKey)` - Usage history của metric

**TODO**: DB retention policy - delete usage metrics older than configured retention period (chưa implement)

### 12.2 Monitoring Dashboards
**Status**: **Chưa có** - Không có dedicated monitoring dashboard
- Có thể query `UsageMetric` repository để build dashboard
- Actuator endpoints available: `/actuator/metrics`, `/actuator/prometheus`

### 12.3 Alert Thresholds
**Status**: **Chưa có** - Không có alert thresholds cho cost control
- Không có alerts khi:
  - News API calls vượt quá threshold
  - Binance API calls vượt quá threshold
  - Cost per user vượt quá limit

### 12.4 Retention Policy
**Status**: **Chưa có** - Không có retention policy cho `UsageMetric`
- Data được lưu vô thời hạn
- Không có cleanup job để xóa old metrics

---

## 13. Chức năng chưa có (Not Implemented)

### 13.1 Security
- ❌ **JWT Refresh Tokens**: Chỉ có access token, không có refresh token mechanism
- ❌ **JWT Rotation**: Không có token rotation
- ❌ **Brute-Force Protection**: Không có account lockout hoặc rate limiting cho login attempts
- ❌ **Password Complexity**: Chỉ check minimum length (8 chars), không check complexity (uppercase, lowercase, numbers, special chars)
- ❌ **PII Logging Rules**: Không có explicit rules về logging PII

### 13.2 Monitoring & Cost Control
- ❌ **Monitoring Dashboards**: Không có dedicated dashboard
- ❌ **Alert Thresholds**: Không có alerts cho API cost thresholds
- ❌ **Retention Policy**: Không có cleanup job cho old `UsageMetric` data

### 13.3 Caching
- ❌ **Cache Warming Strategy**: Không có proactive cache warming

### 13.4 Other Features
- ❌ **AI Analysis**: Entity `ai_reports` tồn tại nhưng chưa có implementation
- ❌ **Glossary Cache**: Entity `glossary_cache` tồn tại nhưng chưa có implementation

### 13.5 Order Endpoints (Partially Implemented)
- ⚠️ **GET /api/orders/{orderId}**: Placeholder - returns message "Order details endpoint - to be implemented"
- ⚠️ **GET /api/orders**: Placeholder - returns empty orders array, pagination params accepted
- ⚠️ **GET /api/orders/portfolio**: Placeholder - returns message "Portfolio endpoint - to be implemented"
- ⚠️ **GET /api/orders/holdings**: Placeholder - returns message "Holdings endpoint - to be implemented"

---

## 14. Utility Classes & Helpers

### 14.1 ControllerHelper
**Purpose**: Centralized utility để get current user từ Spring Security context

**Methods**:
- `getCurrentUserId()` - Returns UUID của current user, hoặc `null` nếu not authenticated
- `getCurrentUser()` - Returns `User` entity của current user, hoặc `null` nếu not authenticated

**Usage**: Được sử dụng trong các controllers để tránh duplicate code

### 14.2 AuditLoggingHelper (Updated)
**Methods**:
- `start(endpoint, userId, normalizedParams)` - Start audit log, returns `AuditContext`
- `finish(ctx, provider, cached, providerMeta, statusCode)` - Finish audit log
- `ok(ctx, data)` - Return success response với requestId
- `ok(ctx, data, provider, cached, providerMeta)` - Return success response và finish audit
- `okWithExtra(ctx, data, extraFields, provider, cached, providerMeta)` - **NEW**: Return success với extra fields
- `error(ctx, errorMessage, status, provider)` - Return error response và finish audit

**Response Format**: Tất cả responses đều include `requestId` trong response body

---

## 15. Rà Soát 24 Mục Chức Năng Quan Trọng

### 15.1 Authentication & Security

#### 1. Password Reset (Forgot Password) + Email Verification
**Status**: ❌ **Chưa có**
- Không có endpoints `/api/auth/forgot`, `/api/auth/reset`
- Không có table `password_resets`
- Không có email service để gửi reset token
- **Cần implement**: SMTP config (SendGrid/SES), password reset token generation, email templates

#### 2. Refresh Tokens (Refresh / Revoke)
**Status**: ❌ **Chưa có**
- Chỉ có access token (expires 24h)
- Không có refresh token mechanism
- Không có table `refresh_tokens`
- Không có endpoints `/api/auth/refresh`, `/api/auth/logout` để revoke
- **Cần implement**: Refresh token generation, storage, rotation logic

#### 3. Global Error Handling & Consistent Error Schema
**Status**: ⚠️ **Partially có**
- **Có**: `AuditLoggingHelper.error()` tạo consistent error format với `requestId`
- **Có**: `BadRequestException` custom exception
- **Chưa có**: `@ControllerAdvice` global exception handler
- **Chưa có**: Centralized error response format cho tất cả exceptions
- **Hiện tại**: Mỗi controller tự handle exceptions, format có thể không nhất quán
- **Cần implement**: `@ControllerAdvice` với `@ExceptionHandler` để handle tất cả exceptions

#### 4. Login Brute-Force Protection
**Status**: ❌ **Chưa có**
- Không có login attempt counter
- Không có account lockout mechanism
- Không có CAPTCHA sau N failed attempts
- Không có Redis keys `login:attempts:{user}`
- **Cần implement**: Attempt tracking, lockout policy, CAPTCHA integration

#### 5. Rate-Limiting for Auth Endpoints
**Status**: ⚠️ **Partially có**
- **Có**: `RateLimitInterceptor` nhưng **excludes** `/api/auth/**` (line 45: `if (path.startsWith("/api/auth/")) { return true; }`)
- Auth endpoints hiện tại **không bị rate limit**
- **Cần implement**: Separate rate limiting cho auth endpoints với lower thresholds (IP-based cho anonymous)

### 15.2 Webhook & Idempotency

#### 6. Webhook Idempotency & Signature Verification
**Status**: ⚠️ **Partially có**
- **Có**: Stripe webhook signature verification (`Webhook.constructEvent()`)
- **Có**: Log `event.getId()` để track
- **Chưa có**: Table `webhook_events_processed` để dedupe
- **Chưa có**: Check `event.id` trước khi process (có thể process same event nhiều lần)
- **Cần implement**: Table với `provider`, `event_id`, `processed_at`, check before processing

### 15.3 Trading & Concurrency

#### 7. Transactional Boundaries & Concurrency Control
**Status**: ✅ **Có**
- **Có**: `@Transactional` trên các methods quan trọng:
  - `OrderService.placeMarketOrder()` - `@Transactional`
  - `OrderService.createLimitOrder()` - `@Transactional`
  - `OrderService.processPendingLimitOrders()` - `@Transactional`
  - `HoldingService`, `PortfolioService`, `UsageService` - đều có `@Transactional`
- **Chưa có**: Optimistic locking (`@Version` column)
- **Chưa có**: `@Version` trên `Holding` và `Portfolio` entities
- **Risk**: Có thể có lost updates trong concurrent scenarios
- **Cần implement**: Thêm `@Version` column và handle `OptimisticLockException`

#### 8. Idempotency for Order Creation
**Status**: ❌ **Chưa có**
- Không có `Idempotency-Key` header handling
- Không có table `idempotency_keys`
- Frontend retries có thể tạo duplicate orders
- **Cần implement**: Accept `Idempotency-Key` header, store mapping `key → orderId`, return stored response nếu key đã dùng

#### 9. Partial Fills, Slippage, Min Order / Tick Size Validation
**Status**: ⚠️ **Partially có**
- **Có**: Order status `PARTIALLY_FILLED` trong enum (chưa implement logic)
- **Có**: `BinanceSymbolInfo` có `tickSize`, `minQty`, `minNotional` từ Binance API
- **Chưa có**: Validation min order size per symbol
- **Chưa có**: Tick size validation
- **Chưa có**: Slippage model (market orders fill instantly at latest price)
- **Chưa có**: Partial fill logic
- **Cần implement**: Symbol metadata validation, slippage simulation, partial fill handling

#### 10. Order-Book / Depth Simulation
**Status**: ✅ **Có**
- **Có**: `Depth` model từ Binance WebSocket
- **Có**: `CacheKeyUtil.depthKey()` và cache depth data
- **Có**: Endpoint `GET /api/v1/binance/websocket/depth/{symbol}` trong `BinanceWebSocketController`
- Depth data được cache từ Binance WebSocket streams
- **Note**: Depth là real-time từ Binance, không phải simulated order book

### 15.4 Email & Notifications

#### 11. Email / Notification Service and Templates
**Status**: ⚠️ **Partially có**
- **Có**: `NotificationService` - tạo notifications trong DB
- **Có**: `Notification` entity với types (ALERT_TRIGGERED)
- **Chưa có**: Email sender service (SMTP/SendGrid/SES)
- **Chưa có**: Email templates
- **Chưa có**: Retry strategies cho email sending
- **Chưa có**: Email verification cho registration
- **Cần implement**: Email service, templates, retry logic

### 15.5 Admin & RBAC

#### 12. Admin Endpoints & Role-Based Access
**Status**: ✅ **Có**
- **Có**: `AdminUsageController` với `@PreAuthorize("hasRole('ADMIN')")`
- **Có**: Security config: `.requestMatchers("/api/admin/**").hasRole("ADMIN")`
- **Có**: `User.role` field với values: "USER", "PRO", "ADMIN"
- **Có**: `isAdmin()` method trong `AdminUsageController`
- **Có**: Integration tests với `@WithMockUser(roles = "ADMIN")`
- **Status**: Fully implemented và protected

### 15.6 Background Jobs & Distributed Systems

#### 13. Leader Election / Scheduler Single-Run Guarantee
**Status**: ❌ **Chưa có**
- **Có**: `@Scheduled` tasks:
  - `LimitOrderMatcherScheduler` - `@Scheduled(fixedDelayString = "${app.limit.matcher.delay:5000}")`
  - `AlertCheckerScheduler` - `@Scheduled(fixedDelayString = "${app.alert.checker.delay:60000}")`
- **Chưa có**: Leader election mechanism
- **Chưa có**: ShedLock hoặc Redis distributed lock
- **Risk**: Khi scale multiple instances, schedulers sẽ chạy trên tất cả instances (duplicate processing)
- **Cần implement**: ShedLock hoặc Redis lock để đảm bảo chỉ 1 instance chạy scheduler

#### 14. Idempotent UsageMetric Increments
**Status**: ⚠️ **Partially có**
- **Có**: `@Transactional` trên `increment()` methods
- **Chưa có**: Batching mechanism
- **Chưa có**: Redis INCR + periodic flush để tránh DB write storms
- **Risk**: High-frequency calls có thể tạo nhiều DB writes
- **Cần implement**: Redis counter + batch flush strategy

### 15.7 WebSocket

#### 15. Backpressure for WebSocket / Per-Connection Message Throttling
**Status**: ⚠️ **Partially có**
- **Có**: Rate limiting cho subscription changes (token bucket)
- **Có**: Max symbols per plan (Free: 5, Pro: 25)
- **Chưa có**: Per-connection message frequency throttling
- **Chưa có**: Backpressure handling khi client không consume messages nhanh
- **Chưa có**: Message queue per connection
- **Cần implement**: Message throttling, backpressure detection, queue management

### 15.8 Monitoring & Observability

#### 16. Monitoring & Alerting (Prometheus + Alertmanager)
**Status**: ⚠️ **Partially có**
- **Có**: Actuator endpoints: `/actuator/metrics`, `/actuator/prometheus`
- **Có**: Prometheus metrics export
- **Chưa có**: Monitoring dashboards (Grafana)
- **Chưa có**: Alertmanager rules
- **Chưa có**: Alert thresholds cho:
  - API cost spikes
  - Job failures
  - Queue lag
  - High error rates
- **Cần implement**: Grafana dashboards, Alertmanager configuration

#### 17. Distributed Tracing / Correlation (requestId → traceId)
**Status**: ⚠️ **Partially có**
- **Có**: `requestId` trong mọi response
- **Có**: `RequestLog` lưu `requestId` với full context
- **Chưa có**: OpenTelemetry integration
- **Chưa có**: TraceId correlation
- **Chưa có**: Distributed tracing across services
- **Note**: `requestId` đủ cho single-service tracking, nhưng không có correlation với external services
- **Cần implement**: OpenTelemetry, trace context propagation

### 15.9 Data Management

#### 18. DB Backup & Retention Policy
**Status**: ❌ **Chưa có**
- Không có scheduled backups
- Không có retention rules cho:
  - `price_snapshots`
  - `usage_metrics`
  - `request_logs`
- **Có**: TODO comment trong `UsageService`: "Implement DB retention policy"
- **Cần implement**: Backup strategy, retention policies, cleanup jobs

#### 19. Secrets Management
**Status**: ⚠️ **Partially có**
- **Có**: Environment variables cho secrets (JWT, DB, API keys)
- **Chưa có**: Vault hoặc secret manager integration
- **Chưa có**: Secret rotation mechanism
- **Note**: OK cho development, nhưng production cần vault/secret manager
- **Cần implement**: Vault integration, secret rotation

#### 20. Pagination, Sorting & Filtering Standardized
**Status**: ⚠️ **Partially có**
- **Có**: Pagination trong một số endpoints:
  - `GET /api/v1/binance/market/all` - có `page`, `size`, `sortBy`
  - `GET /api/orders` - có `page`, `size` (default: 0, 20)
- **Chưa có**: Standardized pagination DTO
- **Chưa có**: Max `size` cap (default: 20, nhưng không có max limit)
- **Chưa có**: Consistent sorting format
- **Chưa có**: Filtering support
- **Cần implement**: Pagination DTO, max size validation (ví dụ: max 100), standard sort/filter format

#### 21. Cache Warming / Manual Invalidation
**Status**: ❌ **Chưa có**
- **Có**: TTL-based expiration
- **Có**: `CacheService.clearAll()` method (manual clear all)
- **Chưa có**: Cache warming strategy
- **Chưa có**: Scheduled prefetch cho heavy symbols
- **Chưa có**: Manual invalidation per key/pattern
- **Cần implement**: Cache warming jobs, invalidation endpoints

#### 22. Retention/Censoring Rules for Logs (PII)
**Status**: ❌ **Chưa có**
- **Có**: `RequestLog` lưu `normalizedParams` và `providerMeta` (có thể chứa PII)
- **Chưa có**: PII redaction rules
- **Chưa có**: Log retention policy
- **Chưa có**: GDPR compliance measures
- **Risk**: Email, fullName có thể xuất hiện trong logs
- **Cần implement**: PII redaction, log retention, GDPR compliance

### 15.10 Testing & Quality

#### 23. Test Coverage & Chaos Testing
**Status**: ⚠️ **Partially có**
- **Có**: Unit tests và integration tests với Testcontainers
- **Có**: Tests cho order flow, Binance proxy, caching
- **Chưa có**: Chaos testing scenarios:
  - Binance API down
  - NewsData.io down
  - Stripe errors
  - Redis timeouts (fail-open behavior)
- **Chưa có**: Tests validate fallback behaviors
- **Cần implement**: Chaos tests, failure scenario tests, fallback validation

### 15.11 API Documentation

#### 24. OpenAPI Completeness & Example Responses
**Status**: ⚠️ **Partially có**
- **Có**: OpenAPI config (`OpenApiConfig`)
- **Có**: Swagger UI tại `/swagger-ui.html`
- **Có**: `@Operation`, `@ApiResponse` annotations trên một số endpoints
- **Chưa có**: Complete examples cho tất cả endpoints
- **Chưa có**: Error response examples
- **Chưa có**: Security requirements documented cho tất cả endpoints
- **Cần implement**: Complete examples, error examples, security documentation

---

## 16. Tổng Kết Trạng Thái

### ✅ Đã Có (Fully Implemented)
1. ✅ **Order-Book / Depth Simulation** - Depth data từ Binance WebSocket
2. ✅ **Admin Endpoints & RBAC** - Admin controller với role-based access
3. ✅ **Transactional Boundaries** - `@Transactional` trên critical methods

### ⚠️ Partially Có (Cần Bổ Sung)
1. ⚠️ **Global Error Handling** - Có format nhưng thiếu `@ControllerAdvice`
2. ⚠️ **Rate-Limiting for Auth** - Auth endpoints không bị rate limit
3. ⚠️ **Webhook Idempotency** - Có signature verification nhưng thiếu dedupe
4. ⚠️ **Partial Fills & Validation** - Có enum nhưng thiếu logic
5. ⚠️ **Email Service** - Có notification DB nhưng thiếu email sender
6. ⚠️ **UsageMetric Batching** - Có transaction nhưng thiếu batching
7. ⚠️ **WebSocket Backpressure** - Có rate limit nhưng thiếu message throttling
8. ⚠️ **Monitoring** - Có Prometheus nhưng thiếu dashboards/alerts
9. ⚠️ **Distributed Tracing** - Có requestId nhưng thiếu OpenTelemetry
10. ⚠️ **Secrets Management** - Có env vars nhưng thiếu vault
11. ⚠️ **Pagination** - Có một số endpoints nhưng chưa standardized
12. ⚠️ **OpenAPI** - Có config nhưng thiếu complete examples

### ❌ Chưa Có (Cần Implement)
1. ❌ **Password Reset + Email Verification**
2. ❌ **Refresh Tokens**
3. ❌ **Login Brute-Force Protection**
4. ❌ **Idempotency for Orders**
5. ❌ **Leader Election / Scheduler Lock**
6. ❌ **DB Backup & Retention**
7. ❌ **Cache Warming**
8. ❌ **PII Logging Rules**
9. ❌ **Chaos Testing**

---

