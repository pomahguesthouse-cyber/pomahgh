-- Drop the foreign key constraint on admin_id to allow WhatsApp sources
ALTER TABLE public.admin_chatbot_audit_logs 
DROP CONSTRAINT IF EXISTS admin_chatbot_audit_logs_admin_id_fkey;

-- Add a column to track the source type
ALTER TABLE public.admin_chatbot_audit_logs 
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'web';

-- Add comment for documentation
COMMENT ON COLUMN public.admin_chatbot_audit_logs.source_type IS 'Source of the request: web or whatsapp';
COMMENT ON COLUMN public.admin_chatbot_audit_logs.admin_id IS 'User ID for web requests, placeholder UUID for WhatsApp';