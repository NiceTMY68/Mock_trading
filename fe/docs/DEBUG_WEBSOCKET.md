# WebSocket Debug Guide

## Vấn đề hiện tại

1. WatchlistPanel hiển thị "Backend not connected" mặc dù backend đang chạy
2. Giá trị thị trường không cập nhật realtime

## Các thay đổi đã thực hiện

### Backend (`be-nodejs`)

1. **binanceWebSocket.js**:
   - Sửa field names: `priceChangePercent` thay vì `priceChange` 
   - Đảm bảo structure đúng với frontend expectations

2. **priceStream.js**:
   - Thêm logging chi tiết cho connections và broadcasts
   - Cải thiện error handling
   - Validate priceData trước khi broadcast
   - Log số lượng clients subscribed

### Frontend (`fe`)

1. **useWebSocket.ts**:
   - Thêm console.log khi kết nối thành công
   - Log price updates trong development mode

2. **useRealtimePrices.ts**:
   - Thêm validation và default values
   - Normalize symbol to uppercase
   - Log khi WebSocket connected

## Cách debug

### 1. Kiểm tra Backend WebSocket

Mở browser console và chạy:
```javascript
const ws = new WebSocket('ws://localhost:3000/ws/prices');
ws.onopen = () => {
  console.log('✅ Connected!');
  ws.send(JSON.stringify({ action: 'subscribe', symbols: ['BTCUSDT'] }));
};
ws.onmessage = (e) => console.log('📨', JSON.parse(e.data));
ws.onerror = (e) => console.error('❌ Error:', e);
ws.onclose = () => console.log('🔌 Closed');
```

### 2. Kiểm tra Backend Logs

Trong terminal backend, bạn sẽ thấy:
- `New WebSocket connection for price streaming from ...`
- `Sent welcome message to client ...`
- `Subscribed to symbols: ...`
- `Broadcasted ... price to X/Y clients`

### 3. Kiểm tra Frontend Console

Trong browser console, bạn sẽ thấy:
- `✅ WebSocket connected to ws://localhost:3000/ws/prices`
- `WebSocket connected to price stream`
- `📊 Price update received: BTCUSDT 50000`

## Các vấn đề có thể xảy ra

1. **WebSocket không kết nối**:
   - Kiểm tra backend có chạy trên port 3000
   - Kiểm tra CORS settings
   - Kiểm tra firewall/antivirus

2. **Không nhận được price updates**:
   - Kiểm tra xem có subscribe symbols chưa
   - Kiểm tra backend logs xem có broadcast không
   - Kiểm tra symbol names có đúng format (uppercase)

3. **BackendStatus hiển thị "not available"**:
   - Health check có thể fail do timeout
   - Kiểm tra `/health` endpoint có hoạt động không

## Next Steps

1. Restart backend server
2. Refresh frontend
3. Mở browser console và kiểm tra logs
4. Kiểm tra backend terminal logs
5. Thử subscribe một symbol và xem có nhận updates không

