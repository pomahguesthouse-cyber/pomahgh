-- Migration: Add use_autopricing column to rooms table
-- Created: 2025-02-07
-- Purpose: Allow rooms to use autopricing as primary price source

-- Add column to rooms table
ALTER TABLE IF EXISTS rooms 
ADD COLUMN IF NOT EXISTS use_autopricing BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN rooms.use_autopricing IS 'If true, use price from price_cache (autopricing) instead of price_per_night';

-- Update existing rooms to use price_per_night as default
UPDATE rooms SET use_autopricing = false WHERE use_autopricing IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_rooms_use_autopricing ON rooms(use_autopricing);

-- Verify column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rooms' AND column_name = 'use_autopricing'
  ) THEN
    RAISE NOTICE '✅ use_autopricing column added successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to add use_autopricing column';
  END IF;
END;
$$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
