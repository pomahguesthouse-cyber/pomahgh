
-- 1. Rename column
ALTER TABLE public.agent_configs RENAME COLUMN system_prompt TO custom_instructions;

-- 2. Audit log table
CREATE TABLE public.agent_config_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_config_id uuid NOT NULL REFERENCES public.agent_configs(id) ON DELETE CASCADE,
  agent_id text NOT NULL,
  field text NOT NULL,
  old_value text,
  new_value text,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_config_audit_agent ON public.agent_config_audit_log(agent_config_id, changed_at DESC);

ALTER TABLE public.agent_config_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON public.agent_config_audit_log
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Service role can insert audit log"
  ON public.agent_config_audit_log
  FOR INSERT
  WITH CHECK (true);

-- 3. Trigger to log changes
CREATE OR REPLACE FUNCTION public.log_agent_config_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.custom_instructions IS DISTINCT FROM OLD.custom_instructions THEN
    INSERT INTO public.agent_config_audit_log (agent_config_id, agent_id, field, old_value, new_value, changed_by)
    VALUES (NEW.id, NEW.agent_id, 'custom_instructions', OLD.custom_instructions, NEW.custom_instructions, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER agent_configs_audit_trigger
  AFTER UPDATE ON public.agent_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.log_agent_config_changes();
