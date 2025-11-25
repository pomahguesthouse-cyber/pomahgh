-- Add target_room_id column for navigation hotspots
ALTER TABLE public.room_hotspots
ADD COLUMN target_room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN public.room_hotspots.target_room_id IS 'For navigation hotspots - the destination room ID';