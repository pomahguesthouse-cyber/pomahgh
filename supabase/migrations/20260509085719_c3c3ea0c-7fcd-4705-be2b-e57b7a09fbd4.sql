
CREATE TABLE IF NOT EXISTS public.fonnte_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_at timestamptz NOT NULL DEFAULT now(),
  device_status text,
  device_connected boolean NOT NULL DEFAULT false,
  last_inbound_at timestamptz,
  minutes_since_last_inbound integer,
  is_idle boolean NOT NULL DEFAULT false,
  alert_sent boolean NOT NULL DEFAULT false,
  alert_reason text,
  raw_response jsonb,
  error_message text
);

CREATE INDEX IF NOT EXISTS idx_fonnte_health_checked_at
  ON public.fonnte_health_checks (checked_at DESC);

CREATE INDEX IF NOT EXISTS idx_fonnte_health_alert_sent
  ON public.fonnte_health_checks (checked_at DESC)
  WHERE alert_sent = true;

ALTER TABLE public.fonnte_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view fonnte health logs"
  ON public.fonnte_health_checks
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.hotel_settings
  ADD COLUMN IF NOT EXISTS fonnte_health_check_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS fonnte_idle_alert_minutes integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS fonnte_alert_cooldown_minutes integer NOT NULL DEFAULT 30;
