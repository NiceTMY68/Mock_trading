# Crypto Community Platform - Backend

Ứng dụng cộng đồng cho những người quan tâm đến Crypto với các chức năng:
- 📊 Theo dõi thị trường với dữ liệu thời gian thực từ Binance
- 📰 Đọc tin tức crypto mới nhất
- ✍️ Đăng blog và chia sẻ kinh nghiệm
- 💬 Tương tác với blog (like, comment, lưu để xem sau)

## Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Cache**: Redis
- **WebSocket**: ws (cho real-time market data)
- **Authentication**: JWT
- **Security**: Helmet, CORS, Rate Limiting

## Cấu trúc dự án

```
be-nodejs/
├── src/
│   ├── index.js              # Entry point
│   ├── config/               # Configuration files
│   ├── routes/               # API routes
│   ├── controllers/          # Request handlers
│   ├── services/             # Business logic
│   ├── models/               # Database models
│   ├── middleware/           # Custom middleware
│   ├── utils/                # Utility functions
│   └── websocket/            # WebSocket handlers
├── migrations/               # Database migrations
├── .env.example              # Environment variables template
└── package.json
```

## Cài đặt

1. Cài đặt dependencies:
```bash
npm install
```

2. Tạo file `.env` dựa trên template trong `ENV_TEMPLATE.md`:
```bash
# Xem ENV_TEMPLATE.md và tạo file .env với các giá trị phù hợp
```

3. Chạy migrations (sẽ tạo sau):
```bash
npm run migrate
```

4. Chạy development server:
```bash
npm run dev
```

## API Endpoints (Sẽ được implement)

### Authentication
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Đăng xuất

### Market Data
- `GET /api/market/overview` - Thống kê tổng quan thị trường (volume, top gainers/losers)
- `GET /api/market/list?page=0&size=100&sortBy=volume` - Danh sách coin với pagination (giống bảng CoinMarketCap)
- `GET /api/market/top?sortBy=volume&limit=50` - Top coin theo volume/priceChange/trades
- `GET /api/market/trending` - Trending coins (kết hợp volume + % tăng)
- `GET /api/market/losers` - Top coin giảm mạnh
- `GET /api/market/new?days=7` - Coin mới list trên Binance
- `GET /api/market/quotes` - Danh sách quote asset (USDT, BTC, BUSD…)
- `GET /api/market/symbols` - Danh sách symbol + metadata (filters, list date)
- `GET /api/market/ticker/:symbol` - Thông tin 24h của 1 coin
- `GET /api/market/klines` - Dữ liệu nến (biểu đồ)
- `GET /api/market/price/:symbol` - Giá realtime (ưu tiên cache WebSocket)
- `GET /api/market/ws/status` - Trạng thái WebSocket Binance
- `WS /ws/prices` - Real-time price streaming nội bộ (client subscribe symbols)

### News
- `GET /api/news` - Danh sách tin tức
- `GET /api/news/:id` - Chi tiết tin tức

### Blog
- `GET /api/blogs` - Danh sách blog
- `GET /api/blogs/:id` - Chi tiết blog
- `POST /api/blogs` - Tạo blog (cần auth)
- `PUT /api/blogs/:id` - Cập nhật blog (cần auth)
- `DELETE /api/blogs/:id` - Xóa blog (cần auth)

### Blog Interactions
- `POST /api/blogs/:id/like` - Like/Unlike blog
- `POST /api/blogs/:id/comments` - Thêm comment
- `DELETE /api/blogs/:id/comments/:commentId` - Xóa comment
- `POST /api/blogs/:id/save` - Lưu blog để xem sau
- `GET /api/blogs/saved` - Danh sách blog đã lưu

## Environment Variables

Xem `ENV_TEMPLATE.md` để biết các biến môi trường cần thiết.

## Frontend Integration

Frontend kết nối đến backend qua:
- **REST API**: `http://localhost:3000/api`
- **WebSocket**: `ws://localhost:3000/ws/prices`

Frontend sử dụng:
- React Query cho data fetching
- Custom hooks (`useWebSocket`, `useRealtimePrices`) cho realtime updates
- Zustand store cho watchlist management

## Documentation

- **API Documentation**: Xem `API_DOCUMENTATION.md` để biết chi tiết về tất cả endpoints
- **Testing Guide**: Xem `TESTING.md` để biết cách test các chức năng
- **Setup Complete**: Xem `SETUP_COMPLETE.md` để biết các service đã được setup

