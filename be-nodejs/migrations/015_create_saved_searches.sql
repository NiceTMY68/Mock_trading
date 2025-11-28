-- Saved searches / Screener presets for users
CREATE TABLE IF NOT EXISTS saved_searches (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  search_type VARCHAR(50) NOT NULL CHECK (search_type IN ('coins', 'posts', 'news', 'all')),
  query_params JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);

CREATE INDEX idx_saved_searches_user ON saved_searches(user_id, created_at DESC);

