# Implementation Plan - Crypto Community Platform

## Phân tích hiện trạng

### Đã có:
- ✅ Market data API (top, trending, losers, new listings, pagination)
- ✅ Binance WebSocket integration với realtime price updates
- ✅ News service (NewsData.io integration)
- ✅ Basic frontend: Dashboard, MarketTable, MarketHighlights, PriceChartPanel
- ✅ WebSocket price streaming
- ✅ Rate limiting middleware
- ✅ Basic auth middleware (JWT)

### Chưa có:
- ❌ Auth system (register, login, roles)
- ❌ Database models (users, watchlists, alerts, portfolio, posts, comments)
- ❌ Blog/Community system
- ❌ Alerts system
- ❌ Portfolio tracker
- ❌ Admin dashboard
- ❌ Role-based access control
- ❌ Rate limiting per role
- ❌ WebSocket subscription limits per role

## Lộ trình triển khai

### Phase 1: Foundation (Ưu tiên cao)
1. Database schema & migrations
2. Auth system với roles (Anonymous/User/Admin)
3. User model & controllers
4. Role-based middleware

### Phase 2: Core Features - User (Ưu tiên cao)
1. Watchlist system
2. Alerts system
3. Portfolio tracker (read-only)
4. Profile & Settings

### Phase 3: Community (Ưu tiên trung bình)
1. Posts system
2. Comments system
3. Reactions/Likes
4. Mentions & Notifications

### Phase 4: Admin (Ưu tiên trung bình)
1. Admin dashboard
2. User management
3. Content moderation
4. System management

### Phase 5: Polish & UX (Ưu tiên thấp)
1. Advanced search & filters
2. Saved searches
3. Chart enhancements
4. Performance optimization

## Database Schema

### Users
- id, email, password_hash, display_name, role, avatar_url, bio, created_at, updated_at, last_login, is_active

### Watchlists
- id, user_id, name, symbols (JSON), order_index, created_at, updated_at

### Alerts
- id, user_id, symbol, condition (ABOVE/BELOW), threshold, method (in-app/email), is_active, triggered_at, created_at

### Portfolio Holdings
- id, user_id, symbol, quantity, buy_price (optional), notes, created_at, updated_at

### Posts
- id, user_id, title, content, symbols (JSON), chart_snapshot (JSON), likes_count, comments_count, created_at, updated_at, is_pinned, is_featured

### Comments
- id, post_id, user_id, content, parent_id (for replies), likes_count, created_at, updated_at

### Reactions
- id, user_id, target_type (post/comment), target_id, reaction_type (like/insightful), created_at

### Reports
- id, reporter_id, target_type, target_id, reason, status, admin_notes, created_at

## API Endpoints Structure

### Auth
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/logout
- GET /api/auth/me

### Watchlists
- GET /api/watchlists
- POST /api/watchlists
- PUT /api/watchlists/:id
- DELETE /api/watchlists/:id
- POST /api/watchlists/:id/symbols

### Alerts
- GET /api/alerts
- POST /api/alerts
- PUT /api/alerts/:id
- DELETE /api/alerts/:id
- GET /api/alerts/history

### Portfolio
- GET /api/portfolio
- POST /api/portfolio/holdings
- PUT /api/portfolio/holdings/:id
- DELETE /api/portfolio/holdings/:id
- GET /api/portfolio/summary

### Posts
- GET /api/posts
- GET /api/posts/:id
- POST /api/posts
- PUT /api/posts/:id
- DELETE /api/posts/:id
- POST /api/posts/:id/like
- POST /api/posts/:id/comments
- GET /api/posts/:id/comments

### Admin
- GET /api/admin/dashboard
- GET /api/admin/users
- PUT /api/admin/users/:id
- GET /api/admin/reports
- PUT /api/admin/reports/:id
- POST /api/admin/cache/invalidate
- GET /api/admin/system/health

## Rate Limits per Role

### Anonymous
- REST API: 100 requests/hour
- WebSocket: Max 5 symbols
- No write operations

### User
- REST API: 1000 requests/hour
- WebSocket: Max 25 symbols
- Full CRUD on own data

### Admin
- REST API: Unlimited
- WebSocket: Unlimited
- Full system access

## Frontend Pages Structure

### Public Pages
- `/` - Landing/Home (Market Overview)
- `/coin/:symbol` - Coin Detail
- `/news` - News Feed
- `/community` - Community Posts
- `/trending` - Trending Coins
- `/new-listings` - New Listings

### User Pages (Protected)
- `/dashboard` - Personal Dashboard
- `/watchlist` - Watchlist Management
- `/alerts` - Alerts Management
- `/portfolio` - Portfolio Tracker
- `/profile` - Profile & Settings
- `/posts/new` - Create Post
- `/posts/:id` - Post Detail

### Admin Pages (Protected, Admin only)
- `/admin` - Admin Dashboard
- `/admin/users` - User Management
- `/admin/moderation` - Content Moderation
- `/admin/system` - System Management

## Next Steps

1. Tạo database migrations
2. Implement auth system
3. Implement user models & controllers
4. Implement watchlist system
5. Implement alerts system
6. Implement portfolio tracker
7. Implement community (posts/comments)
8. Implement admin dashboard
9. Frontend integration
10. Testing & polish

