# Auth System Documentation

## Overview

Authentication system với role-based access control (RBAC) cho 3 roles:
- **Anonymous**: Khách chưa đăng nhập
- **User**: Người dùng đã đăng ký
- **Admin**: Quản trị viên

## Features

### ✅ Implemented

1. **User Registration**
   - Email validation
   - Password hashing (bcrypt)
   - Auto-assign 'user' role
   - JWT token generation

2. **User Login**
   - Email/password authentication
   - JWT access token (15 minutes)
   - Refresh token (7 days)
   - Last login tracking

3. **Token Management**
   - Access token (short-lived)
   - Refresh token (long-lived, stored in DB)
   - Token refresh endpoint
   - Logout with token revocation

4. **Role-Based Access Control**
   - Middleware: `authenticate`, `optionalAuth`
   - Role middleware: `requireRole`, `requireAdmin`, `requireUser`
   - Role-based rate limiting
   - WebSocket subscription limits per role

5. **Rate Limiting**
   - Anonymous: 100 req/15min, 5 WebSocket symbols
   - User: 1000 req/15min, 25 WebSocket symbols
   - Admin: Unlimited

## API Endpoints

### POST /api/auth/register
Register new user

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "displayName": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "displayName": "John Doe",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### POST /api/auth/login
Login user

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** Same as register

### POST /api/auth/refresh
Refresh access token

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed",
  "data": {
    "token": "new_access_token",
    "refreshToken": "new_refresh_token"
  }
}
```

### POST /api/auth/logout
Logout user (revoke refresh token)

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### GET /api/auth/me
Get current user info (protected)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "User retrieved",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "displayName": "John Doe",
      "role": "user",
      "avatarUrl": null,
      "bio": null,
      "stats": {
        "postsCount": 5,
        "commentsCount": 12,
        "watchlistsCount": 2,
        "alertsCount": 3
      }
    }
  }
}
```

## Middleware Usage

### Protect Route (Require Auth)
```javascript
import { authenticate } from '../middleware/auth.js';

router.get('/protected', authenticate, controller.handler);
```

### Optional Auth (Works for both authenticated and anonymous)
```javascript
import { optionalAuth } from '../middleware/auth.js';

router.get('/public', optionalAuth, controller.handler);
// req.user will be set if token is valid, undefined otherwise
```

### Require Specific Role
```javascript
import { requireRole, requireAdmin, requireUser } from '../middleware/roleMiddleware.js';

router.get('/admin-only', authenticate, requireAdmin, controller.handler);
router.get('/user-only', authenticate, requireUser, controller.handler);
router.get('/custom', authenticate, requireRole('user', 'admin'), controller.handler);
```

## WebSocket Authentication

WebSocket connections can include token in query string:
```
ws://localhost:3000/ws/prices?token=<access_token>
```

Subscription limits:
- Anonymous: 5 symbols
- User: 25 symbols
- Admin: Unlimited

## Environment Variables

```env
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
```

## Database Schema

### users table
- id, email, password_hash, display_name, role, avatar_url, bio, social_links, is_active, last_login, created_at, updated_at

### refresh_tokens table
- id, user_id, token, expires_at, created_at

## Security Features

1. **Password Hashing**: bcrypt with salt rounds 10
2. **JWT Tokens**: Signed with secret, short expiration
3. **Refresh Tokens**: Stored in DB, can be revoked
4. **Rate Limiting**: Prevents brute force attacks
5. **Role-Based Access**: Fine-grained permissions
6. **Token Validation**: All tokens verified on each request

## Next Steps

1. ✅ Auth system implemented
2. ⏭️ Frontend auth integration
3. ⏭️ Password reset functionality
4. ⏭️ Email verification (optional)
5. ⏭️ 2FA support (optional)

