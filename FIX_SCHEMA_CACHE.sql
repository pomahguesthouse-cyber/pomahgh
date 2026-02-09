-- QUICK FIX: Add use_autopricing column to rooms table
-- Run this in Supabase SQL Editor to fix schema cache error

-- 1. Add column if not exists
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS use_autopricing BOOLEAN DEFAULT false;

-- 2. Update existing rows
UPDATE rooms 
SET use_autopricing = false 
WHERE use_autopricing IS NULL;

-- 3. Create index
CREATE INDEX IF NOT EXISTS idx_rooms_use_autopricing ON rooms(use_autopricing);

-- 4. Refresh schema cache (IMPORTANT)
NOTIFY pgrst, 'reload schema';

-- 5. Verify
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'rooms' 
AND column_name = 'use_autopricing';
