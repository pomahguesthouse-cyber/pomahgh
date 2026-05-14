-- ============================================================
-- Wire chat_message_ratings into the WhatsApp learning pipeline.
-- Stores aggregated admin rating per analyzed conversation so the
-- deep_analyze step can override the AI-inferred satisfaction signal
-- with the ground-truth admin rating.
-- ============================================================

ALTER TABLE public.whatsapp_conversation_insights
  ADD COLUMN IF NOT EXISTS avg_admin_rating NUMERIC(3, 2),
  ADD COLUMN IF NOT EXISTS admin_rating_count INTEGER DEFAULT 0;

COMMENT ON COLUMN public.whatsapp_conversation_insights.avg_admin_rating
  IS 'Average admin star rating (1-5) across rated messages in this conversation. NULL if none rated.';
COMMENT ON COLUMN public.whatsapp_conversation_insights.admin_rating_count
  IS 'Number of messages in this conversation that have admin ratings.';
