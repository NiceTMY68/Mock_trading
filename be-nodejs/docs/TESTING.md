# Testing Guide

## Prerequisites

1. **PostgreSQL** running on `localhost:5432`
2. **Redis** running on `localhost:6379`
3. **Node.js** v18+ installed
4. Environment variables configured in `.env`

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (see `ENV_TEMPLATE.md`)

3. Start the server:
```bash
npm run dev
```

## Testing Endpoints

### 1. Health Check
```bash
curl http://localhost:3000/health
```

Expected: `{"status":"ok","timestamp":"...","service":"crypto-community-backend"}`

### 2. Market Overview
```bash
curl http://localhost:3000/api/market/overview
```

### 3. Top Coins
```bash
curl "http://localhost:3000/api/market/top?limit=10&sortBy=volume"
```

### 4. Trending Coins
```bash
curl http://localhost:3000/api/market/trending?limit=10
```

### 5. Market List (Paginated)
```bash
curl "http://localhost:3000/api/market/list?page=0&size=20&sortBy=volume"
```

### 6. Ticker
```bash
curl http://localhost:3000/api/market/ticker/BTCUSDT
```

### 7. Klines
```bash
curl "http://localhost:3000/api/market/klines?symbol=BTCUSDT&interval=1h&limit=100"
```

## Testing WebSocket

### Using Browser Console

```javascript
const ws = new WebSocket('ws://localhost:3000/ws/prices');

ws.onopen = () => {
  console.log('Connected');
  ws.send(JSON.stringify({
    action: 'subscribe',
    symbols: ['BTCUSDT', 'ETHUSDT']
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

ws.onerror = (error) => {
  console.error('Error:', error);
};

ws.onclose = () => {
  console.log('Disconnected');
};
```

### Using wscat (if installed)

```bash
npm install -g wscat
wscat -c ws://localhost:3000/ws/prices
```

Then send:
```json
{"action":"subscribe","symbols":["BTCUSDT","ETHUSDT"]}
```

## Testing Frontend

1. Navigate to `fe` directory:
```bash
cd ../fe
```

2. Install dependencies:
```bash
npm install
```

3. Start dev server:
```bash
npm run dev
```

4. Open browser to `http://localhost:5173`

5. Check browser console for:
   - API requests to backend
   - WebSocket connection status
   - Real-time price updates

## Common Issues

### 1. Database Connection Error
- Check PostgreSQL is running: `pg_isready`
- Verify credentials in `.env`

### 2. Redis Connection Error
- Check Redis is running: `redis-cli ping`
- Should return `PONG`

### 3. Binance API Errors
- Check internet connection
- Verify Binance API is accessible
- Check rate limits (1200 req/min)

### 4. WebSocket Not Connecting
- Verify server is running on port 3000
- Check CORS settings
- Verify WebSocket path: `/ws/prices`

## Performance Testing

### Load Test with Apache Bench

```bash
# Test market overview endpoint
ab -n 1000 -c 10 http://localhost:3000/api/market/overview

# Test top coins endpoint
ab -n 1000 -c 10 "http://localhost:3000/api/market/top?limit=10"
```

### Monitor Redis Cache

```bash
redis-cli
> KEYS binance:*
> TTL binance:ticker:BTCUSDT
```

## Integration Testing

1. **Backend → Binance**: Verify data is fetched correctly
2. **Backend → Redis**: Verify caching works
3. **Frontend → Backend**: Verify API calls succeed
4. **Frontend → WebSocket**: Verify real-time updates work

## Expected Behavior

- **First request**: Fetches from Binance API, caches in Redis
- **Subsequent requests**: Served from Redis cache (faster)
- **WebSocket**: Connects automatically, receives price updates every few seconds
- **Pagination**: Works correctly with large datasets
- **Error handling**: Returns proper error messages

