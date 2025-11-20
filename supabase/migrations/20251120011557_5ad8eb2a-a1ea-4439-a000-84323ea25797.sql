-- Add promotional pricing and day-of-week pricing to rooms table
ALTER TABLE public.rooms 
ADD COLUMN promo_price numeric,
ADD COLUMN promo_start_date date,
ADD COLUMN promo_end_date date,
ADD COLUMN monday_price numeric,
ADD COLUMN tuesday_price numeric,
ADD COLUMN wednesday_price numeric,
ADD COLUMN thursday_price numeric,
ADD COLUMN friday_price numeric,
ADD COLUMN saturday_price numeric,
ADD COLUMN sunday_price numeric;

COMMENT ON COLUMN public.rooms.promo_price IS 'Promotional price that overrides all other pricing';
COMMENT ON COLUMN public.rooms.promo_start_date IS 'Start date for promotional pricing';
COMMENT ON COLUMN public.rooms.promo_end_date IS 'End date for promotional pricing';
COMMENT ON COLUMN public.rooms.monday_price IS 'Special price for Mondays';
COMMENT ON COLUMN public.rooms.tuesday_price IS 'Special price for Tuesdays';
COMMENT ON COLUMN public.rooms.wednesday_price IS 'Special price for Wednesdays';
COMMENT ON COLUMN public.rooms.thursday_price IS 'Special price for Thursdays';
COMMENT ON COLUMN public.rooms.friday_price IS 'Special price for Fridays';
COMMENT ON COLUMN public.rooms.saturday_price IS 'Special price for Saturdays';
COMMENT ON COLUMN public.rooms.sunday_price IS 'Special price for Sundays';