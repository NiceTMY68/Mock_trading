# Debug Realtime Price Updates

## Vấn đề: Dữ liệu thị trường không thay đổi

## Checklist để debug

### 1. Backend - Binance WebSocket Connection

Kiểm tra backend logs:
```bash
cd be-nodejs
npm start
```

Bạn sẽ thấy:
- `✅ Binance WebSocket connected` - Nếu không thấy, Binance WebSocket không kết nối được
- `Price update for BTCUSDT: $50000...` - Nếu không thấy, Binance không gửi data
- `✅ Broadcasted BTCUSDT price to X/Y clients` - Nếu không thấy, không có clients subscribed

### 2. Backend - Price Broadcaster

Kiểm tra xem `priceBroadcaster` có được set không:
- Log: `✅ Binance WebSocket price update callback configured`
- Nếu không thấy, có vấn đề với initialization order

### 3. Frontend - WebSocket Connection

Mở browser console và kiểm tra:
- `✅ WebSocket connected to ws://localhost:3000/ws/prices` - Nếu không thấy, WebSocket không kết nối được
- `WebSocket connected to price stream` - Nếu không thấy, không nhận được welcome message

### 4. Frontend - Subscribe Symbols

Kiểm tra xem có subscribe symbols không:
- Backend logs: `Subscribed to symbols: BTCUSDT, ETHUSDT...`
- Nếu không thấy, frontend không subscribe

### 5. Frontend - Receive Updates

Kiểm tra xem có nhận được price updates không:
- Browser console: `📊 Price update received: BTCUSDT 50000`
- Nếu không thấy, không nhận được updates từ backend

## Các vấn đề có thể xảy ra

### Vấn đề 1: Backend không nhận được data từ Binance

**Triệu chứng**: Không thấy log `Price update for...` trong backend

**Nguyên nhân**:
- Binance WebSocket không kết nối được
- Symbols không đúng format
- Binance API có vấn đề

**Giải pháp**:
1. Kiểm tra Binance WebSocket connection status
2. Kiểm tra symbols có đúng format lowercase không
3. Thử reconnect Binance WebSocket

### Vấn đề 2: Backend không broadcast

**Triệu chứng**: Thấy `Price update for...` nhưng không thấy `Broadcasted...`

**Nguyên nhân**:
- `priceBroadcaster` không được set
- `onPriceUpdate` callback không được gọi

**Giải pháp**:
1. Kiểm tra `global.priceBroadcaster` có được set không
2. Kiểm tra `binanceWS.onPriceUpdate` có được set không
3. Thêm delay trong initialization để đảm bảo broadcaster được set trước

### Vấn đề 3: Frontend không kết nối WebSocket

**Triệu chứng**: Không thấy `✅ WebSocket connected` trong browser console

**Nguyên nhân**:
- Backend không chạy
- CORS issues
- WebSocket path không đúng

**Giải pháp**:
1. Kiểm tra backend có chạy trên port 3000 không
2. Kiểm tra CORS settings
3. Kiểm tra WebSocket URL trong frontend

### Vấn đề 4: Frontend không subscribe symbols

**Triệu chứng**: Thấy `✅ WebSocket connected` nhưng không thấy `Subscribed to symbols...` trong backend logs

**Nguyên nhân**:
- `useRealtimePrices` không được gọi
- Symbols array rỗng
- WebSocket chưa connected khi subscribe

**Giải pháp**:
1. Kiểm tra `useRealtimePrices` có được gọi không
2. Kiểm tra symbols array có data không
3. Đảm bảo WebSocket connected trước khi subscribe

### Vấn đề 5: Frontend không nhận được updates

**Triệu chứng**: Thấy `Subscribed to symbols...` nhưng không thấy `📊 Price update received`

**Nguyên nhân**:
- Backend không broadcast đến client này
- Symbol không match (case sensitivity)
- Message format không đúng

**Giải pháp**:
1. Kiểm tra backend logs xem có broadcast không
2. Kiểm tra symbol case (uppercase/lowercase)
3. Kiểm tra message format

## Test Script

Chạy script này trong browser console để test:

```javascript
// Test WebSocket connection
const ws = new WebSocket('ws://localhost:3000/ws/prices');
ws.onopen = () => {
  console.log('✅ WebSocket connected');
  ws.send(JSON.stringify({ action: 'subscribe', symbols: ['BTCUSDT', 'ETHUSDT'] }));
};
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  console.log('📨 Received:', msg);
};
ws.onerror = (e) => console.error('❌ Error:', e);
ws.onclose = () => console.log('🔌 Closed');
```

## Logs để tìm

### Backend logs (should see):
1. `✅ Binance WebSocket connected`
2. `Price update for BTCUSDT: $50000...`
3. `✅ Broadcasted BTCUSDT price to 1/1 clients`

### Frontend console (should see):
1. `✅ WebSocket connected to ws://localhost:3000/ws/prices`
2. `WebSocket connected to price stream`
3. `📊 Price update received: BTCUSDT 50000`

Nếu thiếu bất kỳ log nào, đó là vấn đề cần fix.

