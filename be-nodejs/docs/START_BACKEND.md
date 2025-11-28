# How to Start the Backend

## Prerequisites

1. **Node.js** v18+ installed
2. **PostgreSQL** running (can be skipped if not using database features)
3. **Redis** running (optional, but recommended for caching)

## Quick Start

1. **Install dependencies:**
```bash
cd be-nodejs
npm install
```

2. **Create `.env` file:**
Copy from `ENV_TEMPLATE.md` and fill in your values:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crypto_community
DB_USER=postgres
DB_PASSWORD=your_password
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
BINANCE_API_URL=https://api.binance.com
CORS_ORIGIN=http://localhost:5173
```

3. **Start PostgreSQL** (if using database):
```bash
# Windows (if installed as service, it should auto-start)
# Or use pgAdmin to start

# Linux/Mac
sudo systemctl start postgresql
# or
brew services start postgresql
```

4. **Start Redis** (optional but recommended):
```bash
# Windows: Download Redis from https://redis.io/download
# Or use Docker:
docker run -d -p 6379:6379 redis:alpine

# Linux
sudo systemctl start redis

# Mac
brew services start redis
```

5. **Start the backend:**
```bash
npm run dev
```

You should see:
```
🚀 Server running on port 3000
📡 WebSocket server ready at ws://localhost:3000/ws/prices
🌍 Environment: development
✅ Database initialized
✅ Redis initialized
✅ Services initialized successfully
```

## Verify Backend is Running

1. **Health Check:**
```bash
curl http://localhost:3000/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "...",
  "service": "crypto-community-backend",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

2. **Test API:**
```bash
curl http://localhost:3000/api/market/overview
```

3. **Test WebSocket** (in browser console):
```javascript
const ws = new WebSocket('ws://localhost:3000/ws/prices');
ws.onopen = () => console.log('Connected!');
ws.onmessage = (e) => console.log(JSON.parse(e.data));
```

## Troubleshooting

### Backend won't start
- Check if port 3000 is already in use
- Verify `.env` file exists and has correct values
- Check PostgreSQL/Redis are running if required

### 429 Rate Limit Errors
- Rate limit is set to 1000 requests per 15 minutes in development
- If still hitting limits, increase `max` in `rateLimiter.js`

### WebSocket Connection Failed
- Ensure backend is running on port 3000
- Check CORS settings in `.env`
- Verify WebSocket path: `/ws/prices`

### Database Connection Error
- Verify PostgreSQL is running: `pg_isready`
- Check credentials in `.env`
- Database is optional - backend will work without it for market data

### Redis Connection Error
- Redis is optional - backend will work without it (no caching)
- To use Redis: `docker run -d -p 6379:6379 redis:alpine`

