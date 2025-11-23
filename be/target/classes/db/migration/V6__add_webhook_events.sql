CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,
    event_id VARCHAR(255) UNIQUE NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_event_id ON webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_provider ON webhook_events(provider);

