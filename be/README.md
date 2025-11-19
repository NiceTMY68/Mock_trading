# Crypto Mock Trading Platform

[![Java](https://img.shields.io/badge/Java-17-blue.svg)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5.6-green.svg)](https://spring.io/projects/spring-boot)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-red.svg)](https://redis.io/)

Enterprise-grade cryptocurrency mock trading platform with real-time market data streaming, portfolio management, backtesting, and subscription-based feature gating.

## Features

- **Real-time Market Data**: WebSocket streaming for live price updates via Binance API
- **Mock Trading**: Place market/limit orders, track portfolio performance, manage holdings
- **Backtesting Engine**: SMA crossover strategy testing with performance metrics
- **Price Alerts**: Set price thresholds and receive notifications
- **Watchlists**: Monitor favorite trading pairs
- **Subscription Management**: Stripe integration for premium feature gating
- **Usage Analytics**: Track API calls and resource consumption
- **RESTful API**: Comprehensive REST endpoints with JWT authentication
- **Database Migrations**: Flyway-managed schema versioning

## Tech Stack

- **Framework**: Spring Boot 3.5.6
- **Database**: PostgreSQL 15 with Flyway migrations
- **Cache**: Redis 7 for rate limiting and data caching
- **Security**: JWT-based authentication, Spring Security
- **WebSocket**: Spring WebSocket for real-time streaming
- **Build**: Maven 3.9+

## Prerequisites

- Java 17 or higher
- Docker & Docker Compose
- Maven 3.6+ (or use included Maven wrapper)

## Quick Start

### 1. Environment Configuration

Create `.env` file from template:

```bash
cp .env.example .env
```

Configure required variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `DB_URL` | PostgreSQL JDBC URL | Yes |
| `DB_USER` | Database username | Yes |
| `DB_PASS` | Database password | Yes |
| `REDIS_HOST` | Redis hostname | Yes |
| `REDIS_PORT` | Redis port | Yes |
| `JWT_SECRET` | 256-bit secret for JWT signing | Yes |
| `NEWS_API_KEY` | NewsData.io API key | Optional |
| `STRIPE_SECRET_KEY` | Stripe secret key | Optional |
| `BINANCE_WS_URL` | Optional override for Binance streams | Optional |
| `security.allowed-origins` | Comma-separated list for CORS | Optional |
| `security.require-ssl` | Force HTTPS redirect (`true`/`false`) | Optional |

### 2. Start Infrastructure

```bash
docker-compose up -d
```

Verify services:

```bash
docker-compose ps
```

Expected services:
- PostgreSQL on port 5432
- Redis on port 6379
- MailHog on ports 1025 (SMTP) and 8025 (Web UI)

### 3. Database Migration

Run Flyway migrations:

```bash
./mvnw flyway:migrate
```

Or let Spring Boot auto-migrate on startup.

### 4. Run Application

**Development mode with sample data:**

```bash
SPRING_PROFILES_ACTIVE=dev ./mvnw spring-boot:run
```

**Production mode:**

```bash
./mvnw spring-boot:run
```

Application starts on `http://localhost:8080`

## Sample Data (Dev Profile)

When running with `dev` profile, the following test accounts are created:

| Email | Password | Role | Features |
|-------|----------|------|----------|
| `demo@mocktrading.dev` | `DemoPass123!` | Free | Basic rate limits, no streaming |
| `pro@mocktrading.dev` | `ProPass123!` | Pro | Streaming enabled, 25 symbol subscriptions, pre-seeded watchlist & alerts |

**Pre-seeded market data:**
- Price snapshots for BTCUSDT, ETHUSDT, SOLUSDT
- Pro user watchlist with 3 symbols
- Sample price alert (BTCUSDT above $55,000)

> **Note**: Seeder only runs when no users exist. To re-seed, drop the database or delete all users.

## API Documentation

### Authentication

**POST** `/api/auth/register`
```json
{
  "email": "user@example.com",
  "password": "password123",
  "fullName": "John Doe"
}
```

**POST** `/api/auth/login`
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**GET** `/api/auth/me` (Protected)
- Header: `Authorization: Bearer <jwt-token>`

### Market Data

**GET** `/api/v1/market/symbols` (Protected)
- List all available trading symbols

**GET** `/api/v1/market/klines` (Protected)
- Query parameters: `symbol`, `interval`, `startTime`, `endTime`, `limit`
- Premium feature: extended date ranges

**GET** `/api/v1/market/ticker24hr` (Protected)
- 24-hour ticker statistics

### WebSocket Streaming

**Endpoint:** `ws://localhost:8080/ws/prices`

**Authentication:**
- Header: `Authorization: Bearer <token>`
- Or query param: `?token=<jwt>`

**Subscribe:**
```json
{
  "action": "subscribe",
  "symbols": ["BTCUSDT", "ETHUSDT"]
}
```

**Unsubscribe:**
```json
{
  "action": "unsubscribe",
  "symbols": ["BTCUSDT"]
}
```

**Server Messages:**
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

**Limits:**
- Free tier: 5 symbols max
- Pro tier: 25 symbols max

**Auth sanity check:**
```bash
curl -i http://localhost:8080/api/v1/market/symbols
# Should return 401 Unauthorized without a JWT
```

### Trading

**POST** `/api/orders` (Protected)
```json
{
  "symbol": "BTCUSDT",
  "side": "BUY",
  "type": "MARKET",
  "quantity": 0.001
}
```

**GET** `/api/orders` (Protected)
- List user's orders

**DELETE** `/api/orders/{orderId}` (Protected)
- Cancel pending order

**GET** `/api/portfolio` (Protected)
- Get portfolio summary

**GET** `/api/holdings` (Protected)
- List current holdings

### News

**GET** `/api/news/crypto` (Protected)
- Query parameters: `from_date`, `to_date`, `page`
- Premium feature: crypto news access

### Backtesting

**POST** `/api/backtest` (Protected)
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

### Alerts & Watchlists

**POST** `/api/alerts` (Protected)
```json
{
  "symbol": "BTCUSDT",
  "direction": "ABOVE",
  "threshold": 55000.00
}
```

**GET** `/api/watchlist` (Protected)
- Get user watchlist

**POST** `/api/watchlist/items` (Protected)
- Add symbol to watchlist

## Project Structure

```
be/
├── src/
│   ├── main/
│   │   ├── java/com/example/demo/
│   │   │   ├── client/              # External API clients
│   │   │   │   ├── binance/         # Binance REST & WebSocket
│   │   │   │   └── newsdata/        # NewsData.io client
│   │   │   ├── config/              # Configuration classes
│   │   │   │   ├── SecurityConfig.java
│   │   │   │   ├── CacheConfig.java
│   │   │   │   └── DataSeeder.java  # Dev profile seeder
│   │   │   ├── controller/          # REST controllers
│   │   │   ├── entity/              # JPA entities
│   │   │   ├── repository/          # Spring Data repositories
│   │   │   ├── service/             # Business logic
│   │   │   ├── websocket/           # WebSocket handlers
│   │   │   └── util/                # Utilities
│   │   └── resources/
│   │       ├── application.properties
│   │       └── db/migration/        # Flyway migrations
│   │           └── V1__init.sql
│   └── test/                        # Test suites
├── docker-compose.yml
├── Dockerfile
└── pom.xml
```

## Development

### Running Tests

```bash
# All tests
./mvnw test

# Unit tests only
./mvnw test -Dtest="*Test,!*IntegrationTest"

# Integration tests (requires Docker)
./mvnw test -Dtest="*IntegrationTest"
```

### Database Migrations

```bash
# Manual migration
./mvnw flyway:migrate

# Check migration status
./mvnw flyway:info
```

Migrations are automatically applied on application startup.

### Building

```bash
./mvnw clean package
```

Output: `target/demo-0.0.1-SNAPSHOT.jar`

### Docker Build

```bash
docker build -t crypto-mock-trading:latest .
```

## Configuration

### Application Properties

Key configurations in `application.properties`:

- **Rate Limiting**: Token bucket algorithm with tier-based limits
- **Feature Flags**: Subscription-based feature gating
- **Cache TTL**: Configurable cache expiration for market data
- **Backtest Limits**: Max data points and date range restrictions

### Environment Variables

All sensitive configuration should be provided via environment variables:

```bash
export DB_URL=jdbc:postgresql://localhost:5432/mock_trading
export DB_USER=postgres
export DB_PASS=your_password
export JWT_SECRET=your-256-bit-secret-key
```

## Troubleshooting

### Database Connection Issues

1. Verify PostgreSQL is running: `docker-compose ps`
2. Check credentials match `.env` file
3. Review logs: `docker-compose logs postgres`

### Redis Connection Issues

1. Verify Redis is running: `docker-compose ps`
2. Test connection: `docker exec crypto_trading_redis redis-cli ping`
3. Check logs: `docker-compose logs redis`

### Port Conflicts

Ensure ports are available:
- 5432 (PostgreSQL)
- 6379 (Redis)
- 8080 (Application)
- 1025, 8025 (MailHog)

### Migration Failures

1. Check Flyway schema history: `./mvnw flyway:info`
2. Review migration SQL syntax
3. Verify database user has CREATE privileges

## Security

- Restrict CORS origins via `security.allowed-origins` and enforce HTTPS with `security.require-ssl=true`.
- Keep secrets (JWT, Stripe, NewsData keys) in a secret manager; never log headers containing credentials.
- Sanity check protected endpoints:
  ```bash
  curl -i http://localhost:8080/api/v1/market/symbols
  # Expect 401 Unauthorized without JWT
  ```

## API Keys

### NewsData.io

1. Sign up at [newsdata.io](https://newsdata.io)
2. Get API key from dashboard
3. Add to `.env`: `NEWS_API_KEY=your_key`

### Stripe (Optional)

1. Create test account at [stripe.com](https://stripe.com)
2. Get secret key from dashboard
3. Add to `.env`: `STRIPE_SECRET_KEY=sk_test_...`

### Binance

Public endpoints used by default. No API key required for market data access.

## License

This project is for educational purposes.

## Support

For issues and questions, please open an issue in the repository.
