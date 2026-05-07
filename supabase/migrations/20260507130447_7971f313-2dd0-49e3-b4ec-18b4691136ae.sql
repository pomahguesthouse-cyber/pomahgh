ALTER TABLE public.hotel_settings 
  ADD COLUMN IF NOT EXISTS full_house_price NUMERIC NOT NULL DEFAULT 3000000,
  ADD COLUMN IF NOT EXISTS full_house_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS full_house_description TEXT NOT NULL DEFAULT 'Sewa seluruh guesthouse (semua kamar aktif) — cocok untuk acara keluarga, gathering, atau rombongan.';

CREATE OR REPLACE FUNCTION public.get_public_hotel_settings()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;