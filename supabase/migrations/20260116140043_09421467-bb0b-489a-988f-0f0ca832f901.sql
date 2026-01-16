-- Add session_type column to differentiate guest and admin sessions
ALTER TABLE whatsapp_sessions 
ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'guest';

-- Add check constraint
ALTER TABLE whatsapp_sessions 
ADD CONSTRAINT whatsapp_sessions_type_check CHECK (session_type IN ('guest', 'admin'));

-- Update existing sessions - mark as admin if phone matches manager numbers
UPDATE whatsapp_sessions ws
SET session_type = 'admin'
WHERE EXISTS (
  SELECT 1 FROM hotel_settings hs,
  LATERAL jsonb_array_elements(hs.whatsapp_manager_numbers) AS manager
  WHERE manager->>'phone' = ws.phone_number
);