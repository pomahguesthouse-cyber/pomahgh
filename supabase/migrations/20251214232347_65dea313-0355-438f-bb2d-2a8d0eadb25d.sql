-- Add extra_capacity column to room_addons table
ALTER TABLE room_addons ADD COLUMN extra_capacity integer DEFAULT 0;

-- Update existing extra bed add-ons to have capacity of 1
UPDATE room_addons SET extra_capacity = 1 WHERE LOWER(name) LIKE '%extra bed%';