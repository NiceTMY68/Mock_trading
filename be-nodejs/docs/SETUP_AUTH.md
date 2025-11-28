# Setup Auth System

## Bước 1: Chạy Database Migrations

```bash
cd be-nodejs
npm run migrate
```

Hoặc chạy thủ công:
```bash
psql -U postgres -d mock_trading -f migrations/001_create_users.sql
psql -U postgres -d mock_trading -f migrations/002_create_watchlists.sql
# ... (chạy tất cả các file migrations)
```

## Bước 2: Tạo Admin User

```bash
npm run create-admin
```

Hoặc set environment variables:
```bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=yourpassword npm run create-admin
```

## Bước 3: Test Auth Endpoints

### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "displayName": "Test User"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Get Current User (Protected)
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <access_token>"
```

### Refresh Token
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refresh_token>"
  }'
```

## Environment Variables

Thêm vào `.env`:
```env
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Optional: Admin user creation
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
ADMIN_NAME=Admin User
```

## Rate Limits

- **Anonymous**: 100 requests/15min, 5 WebSocket symbols
- **User**: 1000 requests/15min, 25 WebSocket symbols  
- **Admin**: Unlimited

## Next Steps

1. ✅ Auth system ready
2. ⏭️ Frontend auth integration
3. ⏭️ Watchlist system
4. ⏭️ Alerts system

