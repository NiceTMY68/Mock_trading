CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'USER',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_customer_id VARCHAR(100),
    stripe_subscription_id VARCHAR(100),
    plan_id VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);

CREATE TABLE IF NOT EXISTS request_logs (
    id UUID PRIMARY KEY,
    request_id UUID NOT NULL UNIQUE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    endpoint VARCHAR(255) NOT NULL,
    provider VARCHAR(100),
    normalized_params JSONB,
    cached BOOLEAN NOT NULL DEFAULT FALSE,
    latency_ms BIGINT,
    provider_meta JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS price_snapshots (
    id BIGSERIAL PRIMARY KEY,
    coin_symbol VARCHAR(20) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    open NUMERIC(20,8),
    high NUMERIC(20,8),
    low NUMERIC(20,8),
    close NUMERIC(20,8),
    volume NUMERIC(20,8),
    raw_meta JSONB
);

CREATE INDEX IF NOT EXISTS idx_price_snapshots_symbol_time
    ON price_snapshots (coin_symbol, timestamp DESC);

CREATE TABLE IF NOT EXISTS portfolios (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    virtual_balance NUMERIC(18,8) NOT NULL DEFAULT 0,
    total_invested NUMERIC(18,8) DEFAULT 0,
    total_market_value NUMERIC(18,8) DEFAULT 0,
    total_pnl NUMERIC(18,8) DEFAULT 0,
    total_pnl_percentage NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    order_id UUID NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(30) NOT NULL,
    side VARCHAR(20) NOT NULL,
    type VARCHAR(20) NOT NULL,
    quantity NUMERIC(18,8) NOT NULL,
    price NUMERIC(18,8),
    status VARCHAR(30) NOT NULL,
    filled_quantity NUMERIC(18,8),
    average_price NUMERIC(18,8),
    total_amount NUMERIC(18,8),
    commission NUMERIC(18,8),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);

CREATE TABLE IF NOT EXISTS trades (
    id BIGSERIAL PRIMARY KEY,
    trade_id UUID NOT NULL UNIQUE,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(30) NOT NULL,
    side VARCHAR(20) NOT NULL,
    quantity NUMERIC(18,8) NOT NULL,
    price NUMERIC(18,8) NOT NULL,
    total_amount NUMERIC(18,8) NOT NULL,
    commission NUMERIC(18,8),
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS holdings (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(30) NOT NULL,
    quantity NUMERIC(18,8) NOT NULL,
    average_cost NUMERIC(18,8),
    total_cost NUMERIC(18,8),
    market_value NUMERIC(18,8),
    unrealized_pnl NUMERIC(18,8),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_holdings_user_symbol UNIQUE (user_id, symbol)
);

CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_read BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at);

CREATE TABLE IF NOT EXISTS glossary_cache (
    term VARCHAR(120) PRIMARY KEY,
    summary TEXT NOT NULL,
    source VARCHAR(120),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_reports (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    topic VARCHAR(150) NOT NULL,
    prompt TEXT,
    response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS backtests (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    symbol VARCHAR(20) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    strategy_type VARCHAR(50) NOT NULL,
    strategy_params JSONB,
    initial_balance NUMERIC(18,8),
    final_balance NUMERIC(18,8),
    net_return NUMERIC(18,8),
    return_percent NUMERIC(10,4),
    win_rate NUMERIC(5,2),
    total_trades INT,
    winning_trades INT,
    max_drawdown NUMERIC(10,4),
    data_points INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usage_metrics (
    id BIGSERIAL PRIMARY KEY,
    metric_key VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    amount INT NOT NULL,
    metadata VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_metrics_key ON usage_metrics(metric_key);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_user ON usage_metrics(user_id);

CREATE TABLE IF NOT EXISTS watchlists (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS watchlist_items (
    id BIGSERIAL PRIMARY KEY,
    watchlist_id BIGINT NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    symbol VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_watchlist_symbol UNIQUE (watchlist_id, symbol)
);

CREATE TABLE IF NOT EXISTS alerts (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(30) NOT NULL,
    direction VARCHAR(10) NOT NULL,
    threshold NUMERIC(19,8) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    triggered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alerts_user_symbol_active
    ON alerts(user_id, symbol, active);

