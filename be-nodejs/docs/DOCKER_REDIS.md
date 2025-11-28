# Redis với Docker - Hướng dẫn nhanh

## Redis đã được cấu hình sẵn

Dự án sử dụng container Redis từ backend `be`:
- **Container name**: `crypto_trading_redis`
- **Port**: `6379`
- **Image**: `redis:7-alpine`

## Các lệnh thường dùng

### Khởi động Redis
```bash
docker start crypto_trading_redis
```

### Dừng Redis
```bash
docker stop crypto_trading_redis
```

### Kiểm tra trạng thái
```bash
docker ps --filter "name=redis"
```

### Test kết nối
```bash
docker exec crypto_trading_redis redis-cli ping
# Kết quả: PONG
```

### Xem logs
```bash
docker logs crypto_trading_redis
```

### Xóa container (nếu cần)
```bash
docker stop crypto_trading_redis
docker rm crypto_trading_redis
```

## Sử dụng docker-compose (tùy chọn)

Nếu muốn chạy Redis riêng cho be-nodejs:

```bash
# Khởi động
docker-compose up -d redis

# Dừng
docker-compose down

# Xem logs
docker-compose logs -f redis
```

## Lưu ý

- Redis data được lưu trong Docker volume `redis_data`
- Redis tự động restart nếu container bị dừng (restart: unless-stopped)
- Port 6379 đã được map ra host, có thể kết nối từ `localhost:6379`

