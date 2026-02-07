
-- =============================================
-- 1. Create pricing_events table
-- =============================================
CREATE TABLE public.pricing_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT 'occupancy_update',
  priority INTEGER NOT NULL DEFAULT 5,
  processed BOOLEAN NOT NULL DEFAULT false,
  retry_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  event_data JSONB DEFAULT '{}',
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pricing_events"
  ON public.pricing_events FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access pricing_events"
  ON public.pricing_events FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX idx_pricing_events_unprocessed ON public.pricing_events (processed, priority DESC, created_at ASC) WHERE processed = false;
CREATE INDEX idx_pricing_events_room_id ON public.pricing_events (room_id);

-- =============================================
-- 2. Create price_approvals table
-- =============================================
CREATE TABLE public.price_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  old_price NUMERIC NOT NULL,
  new_price NUMERIC NOT NULL,
  price_change_percentage NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by TEXT,
  rejected_reason TEXT,
  pricing_factors JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.price_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage price_approvals"
  ON public.price_approvals FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access price_approvals"
  ON public.price_approvals FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX idx_price_approvals_pending ON public.price_approvals (status) WHERE status = 'pending';
CREATE INDEX idx_price_approvals_room_id ON public.price_approvals (room_id);

-- =============================================
-- 3. Create price_cache table
-- =============================================
CREATE TABLE public.price_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  cached_price NUMERIC,
  occupancy_rate NUMERIC,
  demand_score NUMERIC,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes'),
  UNIQUE(room_id, date)
);

ALTER TABLE public.price_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage price_cache"
  ON public.price_cache FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access price_cache"
  ON public.price_cache FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================
-- 4. Create calculate_real_time_occupancy function
-- =============================================
CREATE OR REPLACE FUNCTION public.calculate_real_time_occupancy(
  p_room_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  room_id UUID,
  total_allotment INTEGER,
  booked_units BIGINT,
  available_units INTEGER,
  occupancy_rate NUMERIC,
  demand_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH room_info AS (
    SELECT r.id, r.allotment
    FROM rooms r
    WHERE r.id = p_room_id
  ),
  booking_count AS (
    SELECT COUNT(DISTINCT b.id) as cnt
    FROM bookings b
    WHERE b.room_id = p_room_id
      AND b.status NOT IN ('cancelled', 'rejected')
      AND b.check_in <= p_date
      AND b.check_out > p_date
  ),
  week_demand AS (
    SELECT COUNT(DISTINCT b.id) as week_bookings
    FROM bookings b
    WHERE b.room_id = p_room_id
      AND b.status NOT IN ('cancelled', 'rejected')
      AND b.check_in <= (p_date + interval '7 days')::date
      AND b.check_out > p_date
  )
  SELECT 
    ri.id AS room_id,
    ri.allotment AS total_allotment,
    bc.cnt AS booked_units,
    GREATEST(0, ri.allotment - bc.cnt::INTEGER) AS available_units,
    CASE WHEN ri.allotment > 0 
      THEN ROUND((bc.cnt::NUMERIC / ri.allotment) * 100, 1)
      ELSE 0 
    END AS occupancy_rate,
    CASE WHEN ri.allotment > 0 
      THEN ROUND((wd.week_bookings::NUMERIC / (ri.allotment * 7)) * 100, 1)
      ELSE 0 
    END AS demand_score
  FROM room_info ri
  CROSS JOIN booking_count bc
  CROSS JOIN week_demand wd;
END;
$$;

-- =============================================
-- 5. Create trigger for booking_rooms changes
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_booking_rooms_pricing_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_room_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_room_id := OLD.room_id;
  ELSE
    v_room_id := NEW.room_id;
  END IF;

  INSERT INTO public.pricing_events (room_id, event_type, priority, event_data)
  VALUES (
    v_room_id,
    'occupancy_update',
    7,
    jsonb_build_object(
      'trigger', TG_OP,
      'table', TG_TABLE_NAME,
      'timestamp', now()
    )
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER booking_rooms_pricing_event_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.booking_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_booking_rooms_pricing_event();

-- =============================================
-- 6. Add aggressive pricing columns to hotel_settings
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotel_settings' AND column_name = 'aggressive_pricing_enabled') THEN
    ALTER TABLE public.hotel_settings ADD COLUMN aggressive_pricing_enabled BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotel_settings' AND column_name = 'auto_approval_threshold') THEN
    ALTER TABLE public.hotel_settings ADD COLUMN auto_approval_threshold NUMERIC DEFAULT 10;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotel_settings' AND column_name = 'whatsapp_price_approval_enabled') THEN
    ALTER TABLE public.hotel_settings ADD COLUMN whatsapp_price_approval_enabled BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotel_settings' AND column_name = 'last_minute_pricing_enabled') THEN
    ALTER TABLE public.hotel_settings ADD COLUMN last_minute_pricing_enabled BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotel_settings' AND column_name = 'last_minute_hours') THEN
    ALTER TABLE public.hotel_settings ADD COLUMN last_minute_hours INTEGER DEFAULT 24;
  END IF;
END $$;

-- Updated_at triggers
CREATE TRIGGER update_pricing_events_updated_at
  BEFORE UPDATE ON public.pricing_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_price_approvals_updated_at
  BEFORE UPDATE ON public.price_approvals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
