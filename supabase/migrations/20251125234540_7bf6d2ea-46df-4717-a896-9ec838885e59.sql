-- Fix search_path for security
ALTER FUNCTION calculate_room_availability(UUID, DATE, DATE) SET search_path = public;
ALTER FUNCTION trigger_availability_sync() SET search_path = public;