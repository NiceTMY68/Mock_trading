-- Portfolio table (single row per user with JSONB holdings)
CREATE TABLE IF NOT EXISTS portfolio (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  holdings JSONB NOT NULL DEFAULT '[]',
  total_value_usd DECIMAL(20, 8) NOT NULL DEFAULT 0,
  total_cost_basis DECIMAL(20, 8) NOT NULL DEFAULT 0,
  total_pnl DECIMAL(20, 8) NOT NULL DEFAULT 0,
  total_pnl_percent DECIMAL(10, 4) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_portfolio_user_id ON portfolio(user_id);

-- Portfolio snapshots table (for historical tracking)
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_value DECIMAL(20, 8) NOT NULL,
  daily_change DECIMAL(20, 8),
  daily_change_percent DECIMAL(10, 4),
  snapshot_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_portfolio_snapshots_user_id ON portfolio_snapshots(user_id);
CREATE INDEX idx_portfolio_snapshots_created_at ON portfolio_snapshots(user_id, created_at);

