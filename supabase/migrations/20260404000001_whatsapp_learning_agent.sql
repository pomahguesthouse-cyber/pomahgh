-- ============================================================
-- WhatsApp Learning Agent Tables
-- Store conversation insights, FAQ patterns, and learning metrics
-- ============================================================

-- 1. Conversation insights: per-conversation analysis results
CREATE TABLE IF NOT EXISTS public.whatsapp_conversation_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  session_id TEXT,
  
  -- Analysis results
  summary TEXT,                              -- Short summary of conversation
  topics TEXT[] DEFAULT '{}',                -- Topics discussed
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'mixed')),
  intent_flow TEXT[] DEFAULT '{}',           -- Sequence: ['greeting', 'availability_check', 'booking']
  
  -- Quality metrics
  resolution_status TEXT CHECK (resolution_status IN ('resolved', 'unresolved', 'escalated', 'abandoned')),
  bot_accuracy_score NUMERIC(3,2) CHECK (bot_accuracy_score >= 0 AND bot_accuracy_score <= 1),  -- 0.00 - 1.00
  guest_satisfaction_signal TEXT,             -- 'happy', 'frustrated', 'neutral'
  
  -- Extracted patterns
  common_questions JSONB DEFAULT '[]',       -- [{question, frequency_hint, category}]
  failed_responses JSONB DEFAULT '[]',       -- [{user_msg, bot_response, issue}]
  successful_patterns JSONB DEFAULT '[]',    -- [{trigger, response_style, why_worked}]
  
  -- Learning suggestions
  suggested_improvements JSONB DEFAULT '[]', -- [{area, suggestion, priority}]
  new_slang_detected JSONB DEFAULT '[]',     -- [{slang, meaning, context}]
  
  -- Metadata
  message_count INTEGER DEFAULT 0,
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  model_used TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. FAQ patterns: aggregated from multiple conversations
CREATE TABLE IF NOT EXISTS public.whatsapp_faq_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_text TEXT NOT NULL,                -- Generalized question pattern
  canonical_question TEXT NOT NULL,          -- Clean/normalized version
  category TEXT DEFAULT 'general',
  
  -- Frequency tracking
  occurrence_count INTEGER DEFAULT 1,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  conversation_ids UUID[] DEFAULT '{}',
  
  -- Best response tracking
  best_response TEXT,                        -- Best bot response for this pattern
  response_quality_score NUMERIC(3,2) CHECK (response_quality_score >= 0 AND response_quality_score <= 1),  -- How good the best response is (0-1)
  
  -- Status
  is_promoted_to_training BOOLEAN DEFAULT false,
  training_example_id UUID REFERENCES public.chatbot_training_examples(id),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Learning metrics: track learning progress over time
CREATE TABLE IF NOT EXISTS public.whatsapp_learning_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date DATE DEFAULT CURRENT_DATE,
  
  -- Volume
  conversations_analyzed INTEGER DEFAULT 0,
  messages_processed INTEGER DEFAULT 0,
  
  -- Outputs
  insights_generated INTEGER DEFAULT 0,
  faq_patterns_found INTEGER DEFAULT 0,
  training_examples_created INTEGER DEFAULT 0,
  slang_patterns_detected INTEGER DEFAULT 0,
  improvements_suggested INTEGER DEFAULT 0,
  
  -- Quality
  avg_bot_accuracy NUMERIC(3,2),
  avg_resolution_rate NUMERIC(3,2),
  top_unresolved_topics TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_insights_conversation ON public.whatsapp_conversation_insights(conversation_id);
CREATE INDEX IF NOT EXISTS idx_insights_analyzed_at ON public.whatsapp_conversation_insights(analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_faq_patterns_category ON public.whatsapp_faq_patterns(category);
CREATE INDEX IF NOT EXISTS idx_faq_patterns_occurrence ON public.whatsapp_faq_patterns(occurrence_count DESC);
CREATE INDEX IF NOT EXISTS idx_learning_metrics_date ON public.whatsapp_learning_metrics(run_date DESC);

-- RLS
ALTER TABLE public.whatsapp_conversation_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_faq_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_learning_metrics ENABLE ROW LEVEL SECURITY;

-- Insights: admin read/write, service role full access
CREATE POLICY "Admins can view conversation insights"
ON public.whatsapp_conversation_insights FOR SELECT USING (is_admin());

CREATE POLICY "Service role can manage insights"
ON public.whatsapp_conversation_insights FOR ALL USING (auth.role() = 'service_role');

-- FAQ patterns: admin full access
CREATE POLICY "Admins can view FAQ patterns"
ON public.whatsapp_faq_patterns FOR SELECT USING (is_admin());

CREATE POLICY "Admins can manage FAQ patterns"
ON public.whatsapp_faq_patterns FOR ALL USING (is_admin());

CREATE POLICY "Service role can manage FAQ patterns"
ON public.whatsapp_faq_patterns FOR ALL USING (auth.role() = 'service_role');

-- Learning metrics: admin read, service write
CREATE POLICY "Admins can view learning metrics"
ON public.whatsapp_learning_metrics FOR SELECT USING (is_admin());

CREATE POLICY "Service role can manage learning metrics"
ON public.whatsapp_learning_metrics FOR ALL USING (auth.role() = 'service_role');

-- Updated at triggers
CREATE TRIGGER update_faq_patterns_updated_at
BEFORE UPDATE ON public.whatsapp_faq_patterns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
