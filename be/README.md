# Mock Trading Backend

A Spring Boot application for cryptocurrency mock trading with real-time market data from Binance.

## Prerequisites

- Java 17 or higher
- Docker & Docker Compose
- Maven 3.6+ (or use included Maven wrapper)

## Getting Started

### 1. Environment Setup

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` file and update the variables with your actual values:
- Database credentials
- Redis configuration
- JWT secret (use a strong, random string for production)
- API keys (Binance, OpenAI, Stripe)

### 2. Start Infrastructure Services

Start PostgreSQL, Redis, and MailHog using Docker Compose:

```bash
docker-compose up -d
```

Verify all services are running:

```bash
docker-compose ps
```

You should see:
- `crypto_trading_postgres` (PostgreSQL 15) on port 5432
- `crypto_trading_redis` (Redis 7) on port 6379
- `crypto_trading_mailhog` (MailHog) on ports 1025 (SMTP) and 8025 (Web UI)

### 3. Run the Application

#### Using Maven Wrapper (Recommended)

On Windows:
```bash
.\mvnw.cmd spring-boot:run
```

On Linux/Mac:
```bash
./mvnw spring-boot:run
```

#### Using System Maven

```bash
mvn spring-boot:run
```

The application will start on `http://localhost:8080`

## Services

### Database (PostgreSQL)
- **Host:** localhost
- **Port:** 5432
- **Database:** mock_trading
- **Credentials:** Set in `.env` file

### Cache (Redis)
- **Host:** localhost
- **Port:** 6379

### Mail Testing (MailHog)
- **SMTP Server:** localhost:1025
- **Web UI:** http://localhost:8025

Access the MailHog web interface to view all emails sent by the application during development.

## Development

### Running Tests

```bash
./mvnw test
```

### Building the Application

```bash
./mvnw clean package
```

The compiled JAR will be available in the `target/` directory.

### Stopping Services

```bash
docker-compose down
```

To remove volumes as well (⚠️ this will delete all data):

```bash
docker-compose down -v
```

## Project Structure

```
be/
├── src/
│   ├── main/
│   │   ├── java/com/example/demo/
│   │   │   ├── client/         # External API clients (Binance, NewsData)
│   │   │   ├── config/         # Configuration classes
│   │   │   ├── controller/     # REST endpoints
│   │   │   └── DemoApplication.java
│   │   └── resources/
│   │       └── application.properties
│   └── test/
├── docker-compose.yml
├── Dockerfile
├── pom.xml
├── .env.example
└── README.md
```

## API Endpoints

### Binance Market Data
- **GET** `/api/binance/symbols` - List all trading symbols
- **GET** `/api/binance/ticker24hr` - 24hr ticker statistics
- **GET** `/api/binance/ticker24hr/{symbol}` - 24hr ticker for specific symbol

### WebSocket Streams
- **POST** `/api/binance/ws/subscribe` - Subscribe to Binance WebSocket streams
- **POST** `/api/binance/ws/unsubscribe` - Unsubscribe from streams

### News Data
- **GET** `/api/news` - Fetch cryptocurrency news

## Troubleshooting

### Docker Compose fails to start

Make sure Docker Desktop is running and ports 5432, 6379, 1025, and 8025 are not already in use.

### Application can't connect to database

1. Check if PostgreSQL container is running: `docker-compose ps`
2. Verify database credentials in `.env` match those in `application.properties`
3. Check logs: `docker-compose logs postgres`

### Redis connection issues

1. Verify Redis is running: `docker-compose ps`
2. Check connection settings in `.env`
3. Check logs: `docker-compose logs redis`

## License

This project is for educational purposes.

