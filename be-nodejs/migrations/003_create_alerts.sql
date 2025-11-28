-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL,
  condition VARCHAR(10) NOT NULL CHECK (condition IN ('ABOVE', 'BELOW')),
  threshold DECIMAL(20, 8) NOT NULL,
  method VARCHAR(20) DEFAULT 'in-app' CHECK (method IN ('in-app', 'email')),
  is_active BOOLEAN DEFAULT true,
  triggered_at TIMESTAMP,
  triggered_price DECIMAL(20, 8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_symbol ON alerts(symbol);
CREATE INDEX idx_alerts_is_active ON alerts(is_active, symbol);
CREATE INDEX idx_alerts_triggered_at ON alerts(triggered_at);

