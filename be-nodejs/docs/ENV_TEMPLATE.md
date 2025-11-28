# Environment Variables Template

Copy this content to create your `.env` file:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
# Option 1: Use DB_URL (recommended - same as be backend)
DB_URL=jdbc:postgresql://localhost:5432/mock_trading
DB_USER=postgres
DB_PASS=your_password

# Option 2: Use individual variables (backward compatibility)
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=mock_trading
# DB_USER=postgres
# DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=30d

# External APIs
BINANCE_API_URL=https://api.binance.com/api/v3
NEWS_API_KEY=your_news_api_key
NEWS_API_URL=https://newsdata.io/api/1

# Email (Optional - for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# CORS
CORS_ORIGIN=http://localhost:5173
```

## Setup Instructions

1. Create a `.env` file in the root directory
2. Copy the variables above and fill in your values
3. Make sure PostgreSQL and Redis are running
4. Run `npm install` to install dependencies
5. Run `npm run dev` to start the development server

