-- Migration: Add aggressive pricing settings to hotel_settings
-- Created: 2025-02-07
-- Purpose: Store global aggressive pricing configuration

-- Add columns to hotel_settings table
ALTER TABLE hotel_settings 
ADD COLUMN IF NOT EXISTS aggressive_pricing_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_approval_threshold DECIMAL(5,2) DEFAULT 10.0,
ADD COLUMN IF NOT EXISTS whatsapp_price_approval_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS occupancy_30_threshold INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS occupancy_70_threshold INTEGER DEFAULT 70,
ADD COLUMN IF NOT EXISTS occupancy_85_threshold INTEGER DEFAULT 85,
ADD COLUMN IF NOT EXISTS occupancy_95_threshold INTEGER DEFAULT 95,
ADD COLUMN IF NOT EXISTS last_minute_pricing_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_minute_hours INTEGER DEFAULT 24;

-- Add comment for documentation
COMMENT ON COLUMN hotel_settings.aggressive_pricing_enabled IS 'Enable aggressive dynamic pricing based on occupancy and demand';
COMMENT ON COLUMN hotel_settings.auto_approval_threshold IS 'Price change percentage threshold for auto-approval (default: 10%)';
COMMENT ON COLUMN hotel_settings.whatsapp_price_approval_enabled IS 'Send WhatsApp notifications for price approvals';
COMMENT ON COLUMN hotel_settings.occupancy_30_threshold IS 'Occupancy threshold for low demand pricing (default: 30%)';
COMMENT ON COLUMN hotel_settings.occupancy_70_threshold IS 'Occupancy threshold for medium demand pricing (default: 70%)';
COMMENT ON COLUMN hotel_settings.occupancy_85_threshold IS 'Occupancy threshold for high demand pricing (default: 85%)';
COMMENT ON COLUMN hotel_settings.occupancy_95_threshold IS 'Occupancy threshold for critical demand pricing (default: 95%)';
COMMENT ON COLUMN hotel_settings.last_minute_pricing_enabled IS 'Enable last-minute pricing adjustments';
COMMENT ON COLUMN hotel_settings.last_minute_hours IS 'Hours before check-in for last-minute pricing (default: 24)';

-- Update existing rows with default values
UPDATE hotel_settings SET
  aggressive_pricing_enabled = COALESCE(aggressive_pricing_enabled, false),
  auto_approval_threshold = COALESCE(auto_approval_threshold, 10.0),
  whatsapp_price_approval_enabled = COALESCE(whatsapp_price_approval_enabled, true),
  occupancy_30_threshold = COALESCE(occupancy_30_threshold, 30),
  occupancy_70_threshold = COALESCE(occupancy_70_threshold, 70),
  occupancy_85_threshold = COALESCE(occupancy_85_threshold, 85),
  occupancy_95_threshold = COALESCE(occupancy_95_threshold, 95),
  last_minute_pricing_enabled = COALESCE(last_minute_pricing_enabled, false),
  last_minute_hours = COALESCE(last_minute_hours, 24);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_hotel_settings_aggressive_pricing ON hotel_settings(aggressive_pricing_enabled);

-- Verify migration
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM information_schema.columns
  WHERE table_name = 'hotel_settings' 
    AND column_name IN (
      'aggressive_pricing_enabled',
      'auto_approval_threshold',
      'whatsapp_price_approval_enabled'
    );
  
  IF v_count >= 3 THEN
    RAISE NOTICE '✅ Aggressive pricing settings added successfully';
  ELSE
    RAISE WARNING '⚠️ Some columns may be missing. Expected 3, found %', v_count;
  END IF;
END;
$$;
