
CREATE TABLE public.bookingcom_room_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  bookingcom_room_id text NOT NULL,
  bookingcom_rate_id text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(room_id, bookingcom_room_id, bookingcom_rate_id)
);

ALTER TABLE public.bookingcom_room_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bookingcom mappings" ON public.bookingcom_room_mappings
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Anyone can view bookingcom mappings" ON public.bookingcom_room_mappings
  FOR SELECT TO public USING (true);

CREATE TABLE public.bookingcom_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type text NOT NULL,
  direction text NOT NULL,
  room_id uuid REFERENCES public.rooms(id),
  request_payload jsonb,
  response_payload jsonb,
  http_status_code integer,
  success boolean DEFAULT false,
  error_message text,
  duration_ms integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.bookingcom_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view bookingcom logs" ON public.bookingcom_sync_logs
  FOR SELECT TO authenticated USING (is_admin());

CREATE POLICY "Service role can insert bookingcom logs" ON public.bookingcom_sync_logs
  FOR INSERT TO public WITH CHECK (true);

CREATE TRIGGER update_bookingcom_room_mappings_updated_at
  BEFORE UPDATE ON public.bookingcom_room_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
