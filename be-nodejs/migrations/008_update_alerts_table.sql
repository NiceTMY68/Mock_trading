-- Update alerts table to support new conditions and notes
-- First, drop old constraint if exists
ALTER TABLE alerts 
  DROP CONSTRAINT IF EXISTS alerts_condition_check;

-- Add new columns if they don't exist
ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS condition_new VARCHAR(50),
  ADD COLUMN IF NOT EXISTS target_value DECIMAL(20, 8),
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Migrate data from old columns to new format
DO $$
BEGIN
  -- If threshold column exists, copy to target_value
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'alerts' AND column_name = 'threshold') THEN
    UPDATE alerts SET target_value = threshold WHERE target_value IS NULL;
  END IF;

  -- Migrate old condition values to new format
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'alerts' AND column_name = 'condition') THEN
    -- Copy existing condition values
    UPDATE alerts SET condition_new = LOWER(condition) WHERE condition_new IS NULL;
    -- Map old values to new format
    UPDATE alerts SET condition_new = 'above' WHERE condition_new = 'ABOVE' OR condition_new = 'above';
    UPDATE alerts SET condition_new = 'below' WHERE condition_new = 'BELOW' OR condition_new = 'below';
  END IF;
END $$;

-- Drop old columns if they exist (after migration)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'alerts' AND column_name = 'threshold') THEN
    ALTER TABLE alerts DROP COLUMN threshold;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'alerts' AND column_name = 'condition') THEN
    ALTER TABLE alerts DROP COLUMN condition;
  END IF;
END $$;

-- Rename condition_new to condition
ALTER TABLE alerts RENAME COLUMN condition_new TO condition;

-- Set default for condition if null
UPDATE alerts SET condition = 'above' WHERE condition IS NULL;

-- Add check constraint for new condition values
ALTER TABLE alerts
  ADD CONSTRAINT alerts_condition_check 
  CHECK (condition IN ('above', 'below', 'percent_change_up', 'percent_change_down'));

-- Add index for active alerts by symbol
CREATE INDEX IF NOT EXISTS idx_alerts_active_symbol ON alerts(symbol, is_active) WHERE is_active = true;
