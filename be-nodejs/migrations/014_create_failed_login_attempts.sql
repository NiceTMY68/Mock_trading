-- Failed login attempts tracking for security audit
CREATE TABLE IF NOT EXISTS failed_login_attempts (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reason VARCHAR(100)
);

CREATE INDEX idx_failed_logins_email ON failed_login_attempts(email, attempted_at DESC);
CREATE INDEX idx_failed_logins_ip ON failed_login_attempts(ip_address, attempted_at DESC);
CREATE INDEX idx_failed_logins_date ON failed_login_attempts(attempted_at DESC);

-- Cleanup old records (older than 90 days) - can be run periodically
CREATE OR REPLACE FUNCTION cleanup_old_failed_logins()
RETURNS void AS $$
BEGIN
  DELETE FROM failed_login_attempts WHERE attempted_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

