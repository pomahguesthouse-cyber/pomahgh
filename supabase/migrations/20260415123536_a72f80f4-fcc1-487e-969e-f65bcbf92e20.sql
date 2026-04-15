
ALTER TABLE public.agent_configs
  ADD COLUMN IF NOT EXISTS knowledge_base_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS knowledge_base_types text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS can_send_media boolean DEFAULT false;
