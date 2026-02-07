-- Add use_autopricing column to rooms
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS use_autopricing BOOLEAN DEFAULT false;

-- Update existing data
UPDATE rooms SET use_autopricing = false WHERE use_autopricing IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_rooms_use_autopricing ON rooms(use_autopricing);
