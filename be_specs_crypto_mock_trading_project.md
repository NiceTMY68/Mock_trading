# Backend Specification Document

**Project:** Crypto Mock Trading (Mock-trade + AI Coach + Glossary + News + Freemium Subscription)

**Purpose:** Tài liệu backend để dev backend (Java Spring Boot) có thể bắt tay vào coding ngay. Bao gồm: models (DB), views (API endpoints), controllers, services, scheduled jobs, webhook handlers, environment/config variables, công nghệ, deployment notes, testing checklist, và hướng dẫn lấy API keys.

---

## 1. Tổng quan kiến trúc (short)
- **Backend framework:** Java Spring Boot (REST API)
- **DB:** PostgreSQL
- **Cache/fast-store:** Redis (cache glossary, recent price snapshots, sessions if needed)
- **AI:** OpenAI HTTP API
- **Market data & news:** CoinGecko (prices), CryptoPanic (news) / NewsAPI (optional)
- **Payments:** Stripe (Subscriptions)
- **Email:** SMTP provider (SendGrid / Mailgun)
- **Container & Deploy:** Docker, deploy to AWS EC2 / Render / Heroku; RDS for Postgres, ElastiCache for Redis
- **Secrets:** stored in environment variables / secret manager
- **Migrations:** Flyway or Liquibase
- **CI/CD:** GitHub Actions / GitLab CI (optional)

---

## 2. Environment variables / config
List all env vars backend needs (example names):

```
# App
SPRING_PROFILES_ACTIVE=dev
APP_BASE_URL=https://app.example.com
JWT_SECRET=<<secure random>>
JWT_EXPIRATION_MIN=43200

# DB
DATABASE_URL=jdbc:postgresql://host:5432/dbname
DB_USER=
DB_PASSWORD=

# Redis
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=

# OpenAI
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

# Coins/news
COINGECKO_API_BASE=https://api.coingecko.com/api/v3
CRYPTO_PANIC_API_KEY=
NEWSAPI_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Email
SMTP_HOST=
SMTP_PORT=
SMTP_USERNAME=
SMTP_PASSWORD=
FROM_EMAIL=no-reply@example.com

# Misc
SENTRY_DSN= # optional
FEATURE_FLAGS_DB_ENABLED=true

# Deployment/monitoring
APP_ENV=production

```

---

## 3. Database Models (Postgres) — tables and key fields
Below are the canonical models (use types appropriate for Postgres). Use UUID for most PKs for security.

> *Note:* This is a reference. Exact DDL and indices should be created by migrations.

### 3.1 `users`
- `id UUID PK` (gen_random_uuid())
- `email VARCHAR UNIQUE NOT NULL`
- `password_hash TEXT` (bcrypt/argon2)
- `full_name VARCHAR`
- `role VARCHAR` (user, admin)
- `is_verified BOOLEAN DEFAULT false`
- `settings JSONB`
- `stripe_customer_id VARCHAR` (nullable)
- `created_at timestamptz`, `updated_at`

### 3.2 `portfolios`
- `id UUID PK`
- `user_id UUID FK -> users(id)`
- `name VARCHAR`
- `virtual_balance NUMERIC(30,10)`
- `currency VARCHAR` default 'USDT'
- `created_at`, `updated_at`

### 3.3 `coins`
- `symbol VARCHAR(30) PK` (e.g., BTC)
- `name VARCHAR`
- `metadata JSONB` (coingecko id, logo url)

### 3.4 `price_snapshots`
- `id BIGSERIAL PK`
- `coin_symbol VARCHAR FK -> coins(symbol)`
- `price NUMERIC(30,10)`
- `volume NUMERIC`
- `timestamp timestamptz`
- `metadata JSONB`

### 3.5 `orders`
- `id UUID PK`
- `user_id UUID FK`
- `portfolio_id UUID FK`
- `coin_symbol VARCHAR FK`
- `side VARCHAR` ('buy'/'sell')
- `order_type VARCHAR` ('market'/'limit')
- `status VARCHAR` ('pending'/'filled'/'cancelled')
- `price NUMERIC` (limit price, nullable for market)
- `quantity NUMERIC`
- `filled_quantity NUMERIC`
- `filled_value NUMERIC`
- `created_at`, `updated_at`

### 3.6 `trades`
- `id BIGSERIAL PK`
- `order_id UUID FK`
- `user_id UUID FK`
- `portfolio_id UUID FK`
- `coin_symbol VARCHAR FK`
- `price NUMERIC`
- `quantity NUMERIC`
- `side VARCHAR`
- `timestamp timestamptz`

### 3.7 `holdings`
- `id UUID PK`
- `portfolio_id UUID FK`
- `coin_symbol VARCHAR FK`
- `quantity NUMERIC`
- `avg_cost NUMERIC`
- `realized_pl NUMERIC`
- `updated_at`
- **unique(portfolio_id, coin_symbol)**

### 3.8 `watchlists`, `watchlist_items`
- `watchlists`: id, user_id, name
- `watchlist_items`: id, watchlist_id, coin_symbol, added_at

### 3.9 `alerts`
- `id UUID`
- `user_id UUID`
- `coin_symbol VARCHAR`
- `condition VARCHAR` (gt/lt)
- `target_price NUMERIC`
- `is_active BOOLEAN`
- `triggered_at timestamptz`

### 3.10 `news_items`, `news_coins`
- `news_items`: id UUID, title, source, url, summary, published_at, sentiment, raw JSONB
- `news_coins`: news_id FK, coin_symbol FK

### 3.11 `glossary_cache`
- `term VARCHAR PK`
- `definition TEXT`
- `example TEXT`
- `model VARCHAR`
- `tokens_used INT`
- `fetched_at`, `expires_at`
- `raw_response JSONB`

### 3.12 `ai_analysis_reports`
- `id UUID PK`
- `user_id UUID FK`
- `portfolio_id UUID FK`
- `input JSONB` (snapshot content)
- `report TEXT`
- `report_json JSONB` (structured bullets)
- `model VARCHAR`, `tokens_used INT`
- `created_at`

### 3.13 `backtests`, `backtest_trades`
- backtests: id, user_id, coin_symbol, strategy JSONB, params JSONB, start_date, end_date, result_summary JSONB
- backtest_trades: id, backtest_id, price, quantity, side, timestamp

### 3.14 `subscriptions` (Stripe-linked)
- `id UUID PK`
- `user_id UUID FK`
- `stripe_customer_id VARCHAR`
- `stripe_subscription_id VARCHAR`
- `plan VARCHAR` (free / pro-monthly / pro-yearly)
- `status VARCHAR` (active / past_due / canceled)
- `current_period_end timestamptz`
- `created_at`, `updated_at`

### 3.15 `invoices`
- store invoice id, stripe invoice id, status, amount, paid_at

### 3.16 `feature_flags`
- `key VARCHAR PK`
- `enabled BOOLEAN`
- `rules JSONB` (optional per-user or per-plan targeting)

### 3.17 `audit_logs`, `notifications`
- Simple audit and in-app notifications table for traces and UX

---

## 4. API Endpoints (Views) — organized by controllers
Base path: `/api/v1`

> Use RESTful conventions. Return standardized JSON envelope: `{ success: boolean, data: ..., error: {...} }`.

### 4.1 AuthController
- `POST /api/v1/auth/register` → body `{ email, password, full_name }` → creates user, optional send verification email
- `POST /api/v1/auth/login` → `{ email, password }` → returns `{ jwt, user }`
- `POST /api/v1/auth/logout` → invalidate token (optional server-side blacklist)
- `POST /api/v1/auth/forgot` → `{ email }` → sends reset link
- `POST /api/v1/auth/reset` → `{ token, password }` → reset

### 4.2 UserController
- `GET /api/v1/users/me` → auth required → returns user profile
- `PATCH /api/v1/users/me` → update profile
- `GET /api/v1/users/:id` → admin

### 4.3 PortfolioController
- `GET /api/v1/portfolios` → list user portfolios
- `POST /api/v1/portfolios` → create
- `GET /api/v1/portfolios/:id` → details (holdings, equity)
- `PATCH /api/v1/portfolios/:id` → update
- `DELETE /api/v1/portfolios/:id`

### 4.4 CoinsController
- `GET /api/v1/coins` → list supported coins (symbol, name, metadata)
- `GET /api/v1/coins/:symbol` → coin detail (metadata)
- `GET /api/v1/coins/:symbol/price?tf=1d&limit=100` → return price series (from price_snapshots cache or coingecko)

### 4.5 MarketDataController
- `GET /api/v1/market/top-movers` → top gainers/losers from coingecko
- `GET /api/v1/market/search?q=` → fuzzy search
- `GET /api/v1/market/live?symbols=BTC,ETH` → return latest snapshot (use cache)

### 4.6 TradeController / OrderController
- `POST /api/v1/orders` → place order body `{ portfolio_id, coin_symbol, side, order_type, price?, quantity }` → returns order
  - Behavior: Market orders matched immediately against latest price snapshot inside DB transaction -> create trade(s) -> update holdings & portfolio balance atomically
- `GET /api/v1/orders/:id`
- `GET /api/v1/orders?status=pending` → user orders
- `DELETE /api/v1/orders/:id` → cancel limit order if pending

### 4.7 TradesController
- `GET /api/v1/trades?portfolio_id=` → history

### 4.8 HoldingsController
- `GET /api/v1/portfolios/:id/holdings`

### 4.9 WatchlistController
- CRUD for watchlists & items

### 4.10 AlertsController
- `POST /api/v1/alerts` create
- `GET /api/v1/alerts` list
- Scheduler (server-side) evaluates alerts

### 4.11 NewsController
- `GET /api/v1/news` → paginated list (source, sentiment, coins)
- `GET /api/v1/news/:id`
- `GET /api/v1/events` → calendar events

### 4.12 GlossaryController
- `POST /api/v1/glossary/define` → `{ term }` → check cache -> call OpenAI -> cache -> return
- `GET /api/v1/glossary/:term` → read cache

### 4.13 AIAnalysisController
- `POST /api/v1/ai/analyze` → `{ portfolio_id, options }` → assemble snapshot & rules -> call OpenAI (with structured prompt) -> save ai_analysis_reports -> return structured report
- `GET /api/v1/ai/reports?portfolio_id=` list

### 4.14 BacktestController
- `POST /api/v1/backtests` → `{ symbol, start, end, strategy, params }` -> run backtest (async), return backtest id
- `GET /api/v1/backtests/:id` -> result summary & trades

### 4.15 BillingController
- `GET /api/v1/billing/plans` → return plans (free, pro-monthly, pro-yearly)
- `POST /api/v1/billing/checkout` → create Stripe Checkout session or create subscription
- `GET /api/v1/billing/status` → subscription status

### 4.16 WebhookController
- `POST /api/v1/webhooks/stripe` → verify signature (STRIPE_WEBHOOK_SECRET) -> handle events: `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted` -> update `subscriptions` table & notify user

### 4.17 AdminController (protected)
- various admin endpoints: manage users, view logs, trigger job, health checks

---

## 5. Controller / Service Responsibilities (suggested layering)
- **Controller:** validate request, auth, map to DTOs, return HTTP response
- **Service:** business logic, transactional behavior (e.g., matching engine flows)
- **Repository/DAO:** DB access via Spring Data JPA
- **Integration clients:** wrappers for external APIs (OpenAIClient, CoinGeckoClient, CryptoPanicClient, StripeClient)
- **Job Scheduler / Worker:** scheduled tasks (price polling, news fetch, alert evaluation, cache cleanup)
- **Event bus / Async queue:** for heavy async tasks (backtesting, AI calls) use a queue (e.g., RabbitMQ or simple async executor). For MVP, Spring's `@Async` + DB polling is fine.

---

## 6. Key Flows & Pseudo-code
### 6.1 Place Market Order (Transaction)
1. Controller receives `POST /orders` request, validate auth & portfolio_id belongs to user.
2. Service: start DB transaction.
3. Get latest price snapshot for coin (price_snapshots table or cached value). If not found, fetch from CoinGecko synchronously (with timeout) and persist snapshot.
4. Compute cost = price * qty. Verify portfolio.virtual_balance >= cost (for buy) or holdings quantity sufficient (for sell).
5. Create `orders` record with status 'filled'.
6. Create `trades` record with price & qty.
7. Update `holdings`: increase or decrease quantity and recompute avg_cost and realized_pl.
8. Update `portfolios.virtual_balance` accordingly.
9. Commit transaction. Return order & trade.

> All DB writes must be atomic. Use SERIALIZABLE or at least REPEATABLE_READ where necessary. Use optimistic locking on holdings/portfolio rows.

### 6.2 AI Analysis Flow
1. User requests analysis -> backend assembles `input` JSON: current holdings (symbol, qty, avg_cost), last N trades, latest indicators (RSI/SMA) pulled from price_snapshots or computed quickly.
2. Apply deterministic rule checks (rule-based) to flag obvious issues (e.g., entry into overbought RSI>70, position > X% of portfolio).
3. Build prompt: system message: coach persona; user message: include JSON summary + instructions to return structured JSON (correct_points[], issues[], suggestions[]). Example prompt template included in docs folder.
4. Call OpenAI API -> parse response => store in `ai_analysis_reports` with tokens used.
5. Return structured result to UI.

> Save `input` and `raw_response` for audit & reproducibility.

### 6.3 Stripe Webhook handling (invoice.paid)
1. Receive webhook POST, verify signature using `STRIPE_WEBHOOK_SECRET`.
2. On `invoice.paid`: retrieve `customer` & `subscription` ids → find user by `stripe_customer_id` → update `subscriptions` table status `active` and `current_period_end` from event payload; create invoice record; send notification/email.
3. On `invoice.payment_failed`: set subscription `status= past_due` and notify user.
4. Ensure idempotency by recording event ids processed.

---

## 7. Integration & APIs — where to get keys
- **OpenAI**: https://platform.openai.com/ -> create account, generate API key, store in OPENAI_API_KEY
- **CoinGecko**: free public API, no key required for basic endpoints. (Optionally register for higher rate limits)
- **CryptoPanic**: https://cryptopanic.com/developers/ -> signup and get API key
- **NewsAPI** (optional): https://newsapi.org/ -> get API key
- **Stripe**: https://dashboard.stripe.com/ -> create account; obtain `STRIPE_SECRET_KEY` and set up webhook endpoint and `STRIPE_WEBHOOK_SECRET`
- **Email (SendGrid/Mailgun)**: sign up, get SMTP or API key for transactional emails

---

## 8. Feature Flags & Plan gating
- Implement server-side feature flags table `feature_flags` and logic in service layer to check availability:
  - Examples: `realtime_streaming`, `ai_analysis`, `unlimited_backtesting`, `multi_portfolios`, `export_csv`
- When a feature is toggled to `rules: { plan: ['pro'] }` then check user's subscription plan before granting.
- Cache flags in Redis with short TTL for performance.

---

## 9. Scheduled Jobs / Workers
- **Price poller**: every 5–15s for a small list of popular coins (or subscribe to websocket for production), store into `price_snapshots` and Redis cache
- **News fetcher**: every 15–30 minutes fetch news from CryptoPanic/CoinGecko, parse & store
- **Alert evaluator**: every 1–5 minutes evaluate active alerts; trigger notifications and mark triggered_at
- **Cache cleanup**: daily job to remove expired glossary_cache entries
- **Billing sync**: webhook driven; periodic job to reconcile Stripe subscription state
- **Backtest worker**: async queue processing backtesting tasks

---

## 10. Testing & QA
- Unit tests: service logic (order matching, holdings updates, calculations)
- Integration tests: controllers via MockMvc, mocking external clients
- Contract tests: ensure AI prompt templates are stable (use canned responses in tests)
- E2E tests: basic flows (signup -> deposit virtual balance -> place order -> see holdings)
- Load test: simulate many users fetching market data / charts

---

## 11. Security best practices
- Do NOT store any private keys or wallet seeds.
- Hash passwords with Argon2 or bcrypt (work factor reasonably high).
- Use HTTPS only and set HSTS headers.
- Validate & sanitize all inputs; use prepared statements via ORM to avoid SQL injection.
- Rate-limit endpoints (esp. glossary calls to avoid malicious token usage).
- Verify Stripe webhooks signature.
- Audit log critical actions (orders placed, subscription changes, admin actions).

---

## 12. Observability
- Logs: structured JSON logs, include request ids and user ids
- Metrics: expose Prometheus endpoints (if using Prometheus) for key metrics like orders/sec, AI tokens used, subscription churn
- Error tracking: Sentry (optional)

---

## 13. Sample Prompt Template (for engineers building AI integration)
- **System**: "You are a friendly, concise crypto trading coach for beginners. Provide structured JSON with keys: correct_points (array), issues (array), suggestions (array). Keep explanations short. Use numeric references to the input data."
- **User**: "Input: {JSON of holdings, last_trades, indicators}. Return: {correct_points:[], issues:[], suggestions:[]}"

> Example: instruct the model to output only JSON. Backend must validate the model output and fallback to a safe error message if parsing fails.

---

## 14. Deployment checklist (dev -> staging -> prod)
- Setup environment variables & secrets in each environment
- Run DB migrations (Flyway)
- Seed `coins` table via script (top 100 tokens)
- Configure Stripe webhook URL
- Configure OpenAI key and test sample requests
- Configure Redis and ensure connectivity
- Test scheduled jobs in staging
- Configure monitoring & alerts

---

## 15. Onboarding notes for dev
- Codebase structure suggestions:
  - `src/main/java/.../controller` -> REST controllers
  - `.../service` -> business logic
  - `.../repository` -> Spring Data repositories
  - `.../client` -> external api clients (OpenAIClient, CoinGeckoClient, StripeClient)
  - `.../dto` -> request/response DTOs
  - `.../model` -> JPA entities
  - `.../config` -> security, swagger, webclient config
  - `.../jobs` -> scheduled jobs
- Run `mvn spring-boot:run` or via Docker Compose
- Migrations: place SQL in `src/main/resources/db/migration` for Flyway

---

## 16. Quick Start (dev machine)
1. Clone repo
2. Copy `.env.example` to `.env` and fill values
3. Start Postgres & Redis (docker-compose provided)
4. Run Flyway migrations
5. Start app: `./mvnw spring-boot:run` or `docker-compose up --build`
6. Seed coins: `POST /api/v1/admin/seed-coins` (internal endpoint)
7. Create test user and attach stripe test customer (optional)

---

## 17. Appendix: Useful links & references
- OpenAI API docs: https://platform.openai.com/docs
- CoinGecko API docs: https://www.coingecko.com/en/api
- Stripe Subscriptions: https://stripe.com/docs/billing/subscriptions
- CryptoPanic API: https://cryptopanic.com/developers/
- Spring Boot reference: https://spring.io/projects/spring-boot

---

_End of document._

