-- Real-time pricing architecture for aggressive hotel pricing
-- Migration: Add real-time pricing tables and triggers

-- 1. Real-time pricing events table
CREATE TABLE pricing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL CHECK (event_type IN ('booking_change', 'occupancy_update', 'competitor_change', 'time_trigger', 'manual_override')),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    event_data JSONB NOT NULL,
    priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 10),
    processed BOOLEAN DEFAULT FALSE,
    processing_started_at TIMESTAMP WITH TIME ZONE,
    processing_completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Real-time price cache table
CREATE TABLE price_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    price_per_night DECIMAL(10,2) NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    competitor_avg_price DECIMAL(10,2),
    occupancy_rate DECIMAL(5,2),
    demand_multiplier DECIMAL(5,2) DEFAULT 1.0,
    time_multiplier DECIMAL(5,2) DEFAULT 1.0,
    competitor_multiplier DECIMAL(5,2) DEFAULT 1.0,
    final_multiplier DECIMAL(5,2) DEFAULT 1.0,
    pricing_factors JSONB,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(room_id, date)
);

-- 3. Pricing rules engine table
CREATE TABLE pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('occupancy_based', 'time_based', 'competitor_based', 'demand_based', 'revenue_based')),
    conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    is_active BOOLEAN DEFAULT true,
    room_type_ids UUID[] DEFAULT '{}',
    min_occupancy_rate DECIMAL(5,2),
    max_occupancy_rate DECIMAL(5,2),
    valid_from DATE,
    valid_until DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Pricing calculation queue
CREATE TABLE pricing_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    calculation_type TEXT NOT NULL CHECK (calculation_type IN ('real_time', 'batch', 'scheduled')),
    input_data JSONB NOT NULL,
    result_data JSONB,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    processing_time_ms INTEGER,
    worker_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 5. Real-time metrics table
CREATE TABLE pricing_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL CHECK (metric_type IN ('price_change', 'occupancy_rate', 'demand_score', 'revenue_per_room', 'competitor_gap')),
    metric_value DECIMAL(10,2) NOT NULL,
    previous_value DECIMAL(10,2),
    change_percentage DECIMAL(5,2),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    context_data JSONB
);

-- 6. Price approval queue (WhatsApp integration)
CREATE TABLE price_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    old_price DECIMAL(10,2) NOT NULL,
    new_price DECIMAL(10,2) NOT NULL,
    price_change_percentage DECIMAL(5,2) NOT NULL,
    approval_threshold DECIMAL(5,2) DEFAULT 10.0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'auto_approved', 'expired')),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    whatsapp_message_id TEXT,
    auto_approve BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '30 minutes'),
    pricing_calculation_id UUID REFERENCES pricing_calculations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. High-frequency price history
CREATE TABLE price_history_high_freq (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    price DECIMAL(10,2) NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    occupancy_rate DECIMAL(5,2),
    competitor_avg_price DECIMAL(10,2),
    demand_score DECIMAL(5,2),
    trigger_event TEXT,
    calculation_version INTEGER DEFAULT 1
);

-- Indexes for performance
CREATE INDEX idx_pricing_events_room_created ON pricing_events(room_id, created_at DESC);
CREATE INDEX idx_pricing_events_unprocessed ON pricing_events(processed, priority DESC, created_at);
CREATE INDEX idx_price_cache_room_date ON price_cache(room_id, date);
CREATE INDEX idx_price_cache_valid_until ON price_cache(valid_until);
CREATE INDEX idx_pricing_calculations_status ON pricing_calculations(status, created_at);
CREATE INDEX idx_price_approvals_status ON price_approvals(status, expires_at);
CREATE INDEX idx_price_history_high_freq_room_timestamp ON price_history_high_freq(room_id, timestamp DESC);

-- Partition price_history_high_freq by day for performance
CREATE TABLE price_history_high_freq_y2024m01 PARTITION OF price_history_high_freq
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Enable RLS
ALTER TABLE pricing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history_high_freq ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Admin only access for most tables)
CREATE POLICY "Admins can manage pricing_events" ON pricing_events FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can manage price_cache" ON price_cache FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can manage pricing_rules" ON pricing_rules FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can manage pricing_calculations" ON pricing_calculations FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can manage pricing_metrics" ON pricing_metrics FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can manage price_approvals" ON price_approvals FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can manage price_history_high_freq" ON price_history_high_freq FOR ALL USING (public.is_admin());

-- Trigger: Create pricing event on booking changes
CREATE OR REPLACE FUNCTION trigger_pricing_event_on_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO pricing_events (
        event_type,
        room_id,
        event_data,
        priority
    ) VALUES (
        CASE TG_OP
            WHEN 'INSERT' THEN 'booking_change'
            WHEN 'UPDATE' THEN 'booking_change'
            WHEN 'DELETE' THEN 'booking_change'
        END,
        COALESCE(NEW.room_id, OLD.room_id),
        jsonb_build_object(
            'operation', TG_OP,
            'booking_id', COALESCE(NEW.id, OLD.id),
            'old_status', OLD.status,
            'new_status', NEW.status,
            'old_check_in', OLD.check_in,
            'new_check_in', NEW.check_in,
            'old_check_out', OLD.check_out,
            'new_check_out', NEW.check_out,
            'old_price', OLD.total_price,
            'new_price', NEW.total_price,
            'timestamp', now()
        ),
        5 -- Medium priority for booking changes
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach trigger to bookings table
DROP TRIGGER IF EXISTS bookings_pricing_event_trigger ON bookings;
CREATE TRIGGER bookings_pricing_event_trigger
AFTER INSERT OR UPDATE OR DELETE ON bookings
FOR EACH ROW
EXECUTE FUNCTION trigger_pricing_event_on_booking();

-- Trigger: Create pricing event on room price changes
CREATE OR REPLACE FUNCTION trigger_pricing_event_on_room()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO pricing_events (
        event_type,
        room_id,
        event_data,
        priority
    ) VALUES (
        'manual_override',
        NEW.id,
        jsonb_build_object(
            'operation', TG_OP,
            'old_base_price', OLD.base_price,
            'new_base_price', NEW.base_price,
            'old_price_per_night', OLD.price_per_night,
            'new_price_per_night', NEW.price_per_night,
            'timestamp', now()
        ),
        8 -- High priority for manual changes
    );
    
    RETURN NEW;
END;
$$;

-- Attach trigger to rooms table
DROP TRIGGER IF EXISTS rooms_pricing_event_trigger ON rooms;
CREATE TRIGGER rooms_pricing_event_trigger
AFTER UPDATE ON rooms
FOR EACH ROW
WHEN (OLD.base_price IS DISTINCT FROM NEW.base_price OR OLD.price_per_night IS DISTINCT FROM NEW.price_per_night)
EXECUTE FUNCTION trigger_pricing_event_on_room();

-- Function: Get real-time price with cache fallback
CREATE OR REPLACE FUNCTION get_real_time_price(
    p_room_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    price_per_night DECIMAL(10,2),
    base_price DECIMAL(10,2),
    occupancy_rate DECIMAL(5,2),
    competitor_avg_price DECIMAL(10,2),
    demand_multiplier DECIMAL(5,2),
    final_multiplier DECIMAL(5,2),
    is_cached BOOLEAN,
    cache_valid_until TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Try cache first
    RETURN QUERY
    SELECT 
        pc.price_per_night,
        pc.base_price,
        pc.occupancy_rate,
        pc.competitor_avg_price,
        pc.demand_multiplier,
        pc.final_multiplier,
        true,
        pc.valid_until
    FROM price_cache pc
    WHERE pc.room_id = p_room_id 
        AND pc.date = p_date 
        AND pc.valid_until > now()
    LIMIT 1;
    
    -- If no cache found, return empty result
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            NULL::DECIMAL(10,2),
            NULL::DECIMAL(10,2),
            NULL::DECIMAL(5,2),
            NULL::DECIMAL(10,2),
            NULL::DECIMAL(5,2),
            NULL::DECIMAL(5,2),
            false,
            NULL::TIMESTAMP WITH TIME ZONE;
    END IF;
END;
$$;

-- Function: Update price cache
CREATE OR REPLACE FUNCTION update_price_cache(
    p_room_id UUID,
    p_date DATE,
    p_price_per_night DECIMAL(10,2),
    p_base_price DECIMAL(10,2),
    p_occupancy_rate DECIMAL(5,2),
    p_competitor_avg_price DECIMAL(10,2),
    p_pricing_factors JSONB DEFAULT '{}',
    p_valid_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO price_cache (
        room_id,
        date,
        price_per_night,
        base_price,
        occupancy_rate,
        competitor_avg_price,
        pricing_factors,
        valid_until
    ) VALUES (
        p_room_id,
        p_date,
        p_price_per_night,
        p_base_price,
        p_occupancy_rate,
        p_competitor_avg_price,
        p_pricing_factors,
        now() + (p_valid_minutes || ' minutes')::INTERVAL
    )
    ON CONFLICT (room_id, date)
    DO UPDATE SET
        price_per_night = EXCLUDED.price_per_night,
        base_price = EXCLUDED.base_price,
        occupancy_rate = EXCLUDED.occupancy_rate,
        competitor_avg_price = EXCLUDED.competitor_avg_price,
        pricing_factors = EXCLUDED.pricing_factors,
        valid_until = EXCLUDED.valid_until,
        updated_at = now();
    
    RETURN true;
END;
$$;