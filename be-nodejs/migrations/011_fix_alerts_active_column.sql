-- Fix alerts table: ensure active column exists
-- This migration handles both cases: is_active or active

DO $$
BEGIN
  -- If is_active exists but active doesn't, rename it
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'alerts' AND column_name = 'is_active')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name = 'alerts' AND column_name = 'active') THEN
    ALTER TABLE alerts RENAME COLUMN is_active TO active;
  END IF;
  
  -- If neither exists, add active column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'alerts' AND column_name = 'active')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name = 'alerts' AND column_name = 'is_active') THEN
    ALTER TABLE alerts ADD COLUMN active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Update index to use active column
DROP INDEX IF EXISTS idx_alerts_active_symbol;
CREATE INDEX IF NOT EXISTS idx_alerts_active_symbol ON alerts(symbol, active) WHERE active = true;

