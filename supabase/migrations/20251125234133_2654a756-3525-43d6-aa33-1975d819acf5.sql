-- Enable pg_net extension for async HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Table 1: Channel Managers Configuration
CREATE TABLE channel_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('api', 'webhook')),
  is_active BOOLEAN DEFAULT true,
  
  -- API Configuration
  api_endpoint TEXT,
  api_key_secret TEXT,
  auth_type TEXT DEFAULT 'bearer',
  
  -- Webhook Configuration  
  webhook_url TEXT,
  webhook_secret TEXT,
  
  -- Retry Settings
  max_retries INTEGER DEFAULT 3,
  retry_delay_seconds INTEGER DEFAULT 60,
  
  -- Metadata
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_sync_status TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table 2: Availability Sync Queue
CREATE TABLE availability_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_manager_id UUID REFERENCES channel_managers(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  
  -- Date range
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  
  -- Availability data
  availability_data JSONB NOT NULL,
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed')),
  retry_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  
  -- Error logging
  error_message TEXT,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  triggered_by TEXT,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_sync_queue_status ON availability_sync_queue(status, next_retry_at);
CREATE INDEX idx_sync_queue_channel ON availability_sync_queue(channel_manager_id);

-- Table 3: Availability Sync Logs
CREATE TABLE availability_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_queue_id UUID REFERENCES availability_sync_queue(id) ON DELETE CASCADE,
  channel_manager_id UUID REFERENCES channel_managers(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  
  -- Request/Response
  request_payload JSONB,
  response_payload JSONB,
  http_status_code INTEGER,
  
  -- Timing
  duration_ms INTEGER,
  
  -- Result
  success BOOLEAN,
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_sync_logs_created ON availability_sync_logs(created_at DESC);
CREATE INDEX idx_sync_logs_channel ON availability_sync_logs(channel_manager_id);

-- RLS Policies (Admin only access)
ALTER TABLE channel_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage channel_managers"
  ON channel_managers FOR ALL
  USING (public.is_admin());

CREATE POLICY "Admins can view sync_queue"
  ON availability_sync_queue FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can view sync_logs"
  ON availability_sync_logs FOR SELECT
  USING (public.is_admin());

-- Function: Calculate Room Availability
CREATE OR REPLACE FUNCTION calculate_room_availability(
  p_room_id UUID,
  p_date_from DATE,
  p_date_to DATE
)
RETURNS TABLE(
  availability_date DATE,
  total_allotment INTEGER,
  booked_count INTEGER,
  available_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      p_date_from,
      p_date_to,
      '1 day'::interval
    )::DATE AS date
  ),
  room_info AS (
    SELECT allotment
    FROM rooms
    WHERE id = p_room_id
  ),
  booking_counts AS (
    SELECT 
      ds.date,
      COUNT(DISTINCT b.id) as bookings
    FROM date_series ds
    LEFT JOIN bookings b ON (
      b.room_id = p_room_id
      AND b.status NOT IN ('cancelled', 'rejected')
      AND ds.date >= b.check_in
      AND ds.date < b.check_out
    )
    GROUP BY ds.date
  ),
  unavailable_dates AS (
    SELECT unavailable_date
    FROM room_unavailable_dates
    WHERE room_id = p_room_id
      AND unavailable_date BETWEEN p_date_from AND p_date_to
  )
  SELECT 
    bc.date AS availability_date,
    ri.allotment AS total_allotment,
    bc.bookings::INTEGER AS booked_count,
    CASE 
      WHEN ud.unavailable_date IS NOT NULL THEN 0
      ELSE GREATEST(0, ri.allotment - bc.bookings::INTEGER)
    END AS available_count
  FROM booking_counts bc
  CROSS JOIN room_info ri
  LEFT JOIN unavailable_dates ud ON ud.unavailable_date = bc.date
  ORDER BY bc.date;
END;
$$;

-- Trigger Function: Auto-sync on booking changes
CREATE OR REPLACE FUNCTION trigger_availability_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_date_from DATE;
  v_date_to DATE;
  v_room_id UUID;
  v_booking_id UUID;
  v_supabase_url TEXT;
  v_service_key TEXT;
BEGIN
  -- Get Supabase URL and key from environment
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_service_key := current_setting('app.settings.service_role_key', true);
  
  -- If settings not available, try to get from secrets
  IF v_supabase_url IS NULL THEN
    v_supabase_url := current_setting('supabase_url', true);
  END IF;
  
  -- Determine date range and room based on operation
  IF TG_OP = 'DELETE' THEN
    v_date_from := OLD.check_in;
    v_date_to := OLD.check_out + INTERVAL '30 days';
    v_room_id := OLD.room_id;
    v_booking_id := OLD.id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_date_from := LEAST(OLD.check_in, NEW.check_in);
    v_date_to := GREATEST(OLD.check_out, NEW.check_out) + INTERVAL '30 days';
    v_room_id := NEW.room_id;
    v_booking_id := NEW.id;
  ELSE -- INSERT
    v_date_from := NEW.check_in;
    v_date_to := NEW.check_out + INTERVAL '30 days';
    v_room_id := NEW.room_id;
    v_booking_id := NEW.id;
  END IF;

  -- Call edge function asynchronously using pg_net
  IF v_supabase_url IS NOT NULL THEN
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/sync-availability',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(v_service_key, '')
      ),
      body := jsonb_build_object(
        'room_id', v_room_id,
        'date_from', v_date_from,
        'date_to', v_date_to,
        'triggered_by', lower(TG_OP),
        'booking_id', v_booking_id
      )
    );
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Attach trigger to bookings table
DROP TRIGGER IF EXISTS bookings_sync_availability ON bookings;
CREATE TRIGGER bookings_sync_availability
AFTER INSERT OR UPDATE OR DELETE ON bookings
FOR EACH ROW
EXECUTE FUNCTION trigger_availability_sync();