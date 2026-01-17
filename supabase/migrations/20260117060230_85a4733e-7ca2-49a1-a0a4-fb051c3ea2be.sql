-- Add guest_name column to whatsapp_sessions table
ALTER TABLE public.whatsapp_sessions 
ADD COLUMN guest_name VARCHAR(100);