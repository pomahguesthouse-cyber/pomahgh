
-- Remove the public SELECT policy
DROP POLICY "Anyone can view hotel settings" ON public.hotel_settings;

-- Only admins and service_role can read hotel_settings directly
CREATE POLICY "Only admins can view hotel settings"
ON public.hotel_settings FOR SELECT
USING (public.is_admin() OR auth.role() = 'service_role');

-- Update the public function to strip MORE sensitive fields
CREATE OR REPLACE FUNCTION public.get_public_hotel_settings()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT to_jsonb(t) 
    - 'whatsapp_manager_numbers' 
    - 'whatsapp_ai_whitelist' 
    - 'whatsapp_session_timeout_minutes'
    - 'whatsapp_response_mode'
    - 'account_number' 
    - 'account_holder_name' 
    - 'bank_name'
    - 'payment_instructions'
    - 'aggressive_pricing_enabled'
    - 'auto_approval_threshold'
    - 'last_minute_pricing_enabled'
    - 'last_minute_hours'
    - 'whatsapp_price_approval_enabled'
    - 'auto_send_invoice'
  FROM (SELECT * FROM public.hotel_settings LIMIT 1) t;
$$;
