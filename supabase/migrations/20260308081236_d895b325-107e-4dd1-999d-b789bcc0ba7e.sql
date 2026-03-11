
-- 1. Enable RLS on tables missing it
ALTER TABLE public.booking_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS policies for booking_drafts
CREATE POLICY "Service role can manage booking drafts" ON public.booking_drafts FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Admins can view booking drafts" ON public.booking_drafts FOR SELECT USING (public.is_admin());

-- RLS policies for whatsapp_events
CREATE POLICY "Service role can manage whatsapp events" ON public.whatsapp_events FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Admins can view whatsapp events" ON public.whatsapp_events FOR SELECT USING (public.is_admin());

-- RLS policies for whatsapp_rate_limits
CREATE POLICY "Service role can manage whatsapp rate limits" ON public.whatsapp_rate_limits FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Admins can view whatsapp rate limits" ON public.whatsapp_rate_limits FOR SELECT USING (public.is_admin());

-- 2. Fix manager_access_tokens
DROP POLICY IF EXISTS "Anyone can validate tokens" ON public.manager_access_tokens;
CREATE POLICY "Service role can read tokens" ON public.manager_access_tokens FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "Admins can read tokens" ON public.manager_access_tokens FOR SELECT USING (public.is_admin());

-- 3. Fix payment_transactions
DROP POLICY IF EXISTS "Anyone can read payment transactions by booking" ON public.payment_transactions;
CREATE POLICY "Authorized users can read payment transactions" ON public.payment_transactions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = payment_transactions.booking_id
    AND b.user_id IS NOT NULL
    AND b.user_id = auth.uid()
  )
  OR public.is_admin()
  OR auth.role() = 'service_role'
);

DROP POLICY IF EXISTS "Service role can update payment transactions" ON public.payment_transactions;
CREATE POLICY "Service role can update payment transactions" ON public.payment_transactions FOR UPDATE USING (auth.role() = 'service_role' OR public.is_admin());

-- 4. Public-safe hotel settings function
CREATE OR REPLACE FUNCTION public.get_public_hotel_settings()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT to_jsonb(t) - 'whatsapp_manager_numbers' - 'whatsapp_ai_whitelist' - 'account_number' - 'account_holder_name' - 'bank_name'
  FROM (SELECT * FROM public.hotel_settings LIMIT 1) t;
$$;

-- 5. Fix landing_pages
DROP POLICY IF EXISTS "Admins can manage all landing pages" ON public.landing_pages;
CREATE POLICY "Admins can manage all landing pages" ON public.landing_pages FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 6. Fix theme/widget/element/template write policies
DROP POLICY IF EXISTS "Authenticated users can insert theme" ON public.theme_config;
DROP POLICY IF EXISTS "Authenticated users can update theme" ON public.theme_config;
CREATE POLICY "Admins can insert theme" ON public.theme_config FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update theme" ON public.theme_config FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can manage widget config" ON public.widget_config;
CREATE POLICY "Admins can manage widget config" ON public.widget_config FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can manage element_overrides" ON public.element_overrides;
CREATE POLICY "Admins can manage element_overrides" ON public.element_overrides FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can manage custom presets" ON public.template_presets;
CREATE POLICY "Admins can manage template presets" ON public.template_presets FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 7. Fix admin chatbot tables
DROP POLICY IF EXISTS "Authenticated users can view admin knowledge" ON public.admin_chatbot_knowledge_base;
DROP POLICY IF EXISTS "Authenticated users can insert admin knowledge" ON public.admin_chatbot_knowledge_base;
DROP POLICY IF EXISTS "Authenticated users can update admin knowledge" ON public.admin_chatbot_knowledge_base;
DROP POLICY IF EXISTS "Authenticated users can delete admin knowledge" ON public.admin_chatbot_knowledge_base;
CREATE POLICY "Admins can view admin knowledge" ON public.admin_chatbot_knowledge_base FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can insert admin knowledge" ON public.admin_chatbot_knowledge_base FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update admin knowledge" ON public.admin_chatbot_knowledge_base FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete admin knowledge" ON public.admin_chatbot_knowledge_base FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can view admin training" ON public.admin_chatbot_training_examples;
DROP POLICY IF EXISTS "Authenticated users can insert admin training" ON public.admin_chatbot_training_examples;
DROP POLICY IF EXISTS "Authenticated users can update admin training" ON public.admin_chatbot_training_examples;
DROP POLICY IF EXISTS "Authenticated users can delete admin training" ON public.admin_chatbot_training_examples;
CREATE POLICY "Admins can view admin training" ON public.admin_chatbot_training_examples FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can insert admin training" ON public.admin_chatbot_training_examples FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update admin training" ON public.admin_chatbot_training_examples FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete admin training" ON public.admin_chatbot_training_examples FOR DELETE USING (public.is_admin());
