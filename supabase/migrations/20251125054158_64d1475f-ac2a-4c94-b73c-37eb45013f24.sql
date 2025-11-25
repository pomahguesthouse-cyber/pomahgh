-- Add floor plan fields to rooms table
ALTER TABLE rooms
ADD COLUMN floor_plan_url TEXT,
ADD COLUMN floor_plan_enabled BOOLEAN DEFAULT false;

-- Add floor plan coordinates to room_panoramas table
ALTER TABLE room_panoramas
ADD COLUMN floor_plan_x FLOAT,
ADD COLUMN floor_plan_y FLOAT,
ADD COLUMN floor_plan_icon TEXT DEFAULT 'MapPin';

-- Create index for better query performance
CREATE INDEX idx_room_panoramas_floor_plan ON room_panoramas(room_id, floor_plan_x, floor_plan_y) WHERE floor_plan_x IS NOT NULL AND floor_plan_y IS NOT NULL;