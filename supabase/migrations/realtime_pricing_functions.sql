-- Real-time pricing triggers and advanced functions
-- This file contains the core logic for real-time pricing calculations

-- 1. Advanced occupancy calculation function
CREATE OR REPLACE FUNCTION calculate_real_time_occupancy(
    p_room_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    total_allotment INTEGER,
    booked_units INTEGER,
    available_units INTEGER,
    occupancy_rate DECIMAL(5,2),
    demand_score DECIMAL(5,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_allotment INTEGER;
    v_booked_units INTEGER;
    v_available_units INTEGER;
    v_occupancy_rate DECIMAL(5,2);
    v_demand_score DECIMAL(5,2);
    v_competitor_avg DECIMAL(10,2);
    v_our_price DECIMAL(10,2);
BEGIN
    -- Get room allotment
    SELECT r.allotment INTO v_total_allotment
    FROM rooms r
    WHERE r.id = p_room_id;
    
    -- Count booked units for the date
    SELECT COUNT(DISTINCT br.room_number) INTO v_booked_units
    FROM booking_rooms br
    JOIN bookings b ON br.booking_id = b.id
    WHERE br.room_id = p_room_id
        AND b.status NOT IN ('cancelled', 'rejected')
        AND p_date >= b.check_in
        AND p_date < b.check_out;
    
    -- Calculate availability
    v_available_units := GREATEST(0, v_total_allotment - v_booked_units);
    
    -- Calculate occupancy rate
    IF v_total_allotment > 0 THEN
        v_occupancy_rate := (v_booked_units::DECIMAL / v_total_allotment::DECIMAL) * 100;
    ELSE
        v_occupancy_rate := 0;
    END IF;
    
    -- Calculate demand score based on occupancy and competitor pricing
    SELECT AVG(cps.price) INTO v_competitor_avg
    FROM competitor_price_surveys cps
    JOIN competitor_rooms cr ON cps.competitor_room_id = cr.id
    WHERE cr.comparable_room_id = p_room_id
        AND cps.survey_date >= p_date - INTERVAL '7 days'
        AND cps.survey_date <= p_date + INTERVAL '7 days';
    
    -- Get our current price
    SELECT COALESCE(base_price, price_per_night) INTO v_our_price
    FROM rooms
    WHERE id = p_room_id;
    
    -- Calculate demand score (0-100 scale)
    IF v_competitor_avg > 0 THEN
        v_demand_score := LEAST(100, 
            (v_occupancy_rate * 0.6) + 
            (CASE WHEN v_our_price < v_competitor_avg THEN 30 ELSE 10 END) +
            (CASE WHEN v_occupancy_rate > 80 THEN 10 ELSE 0 END)
        );
    ELSE
        v_demand_score := LEAST(100, v_occupancy_rate);
    END IF;
    
    RETURN QUERY
    SELECT v_total_allotment, v_booked_units, v_available_units, 
           v_occupancy_rate, v_demand_score;
END;
$$;

-- 2. Real-time pricing calculation engine
CREATE OR REPLACE FUNCTION calculate_real_time_price(
    p_room_id UUID,
    p_date DATE DEFAULT CURRENT_DATE,
    p_force_recache BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
    room_id UUID,
    date DATE,
    base_price DECIMAL(10,2),
    calculated_price DECIMAL(10,2),
    occupancy_rate DECIMAL(5,2),
    demand_multiplier DECIMAL(5,2),
    time_multiplier DECIMAL(5,2),
    competitor_multiplier DECIMAL(5,2),
    final_multiplier DECIMAL(5,2),
    pricing_factors JSONB,
    calculation_time_ms INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_time TIMESTAMP WITH TIME ZONE := clock_timestamp();
    v_room_data RECORD;
    v_occupancy_data RECORD;
    v_competitor_avg DECIMAL(10,2);
    v_time_multiplier DECIMAL(5,2) := 1.0;
    v_occupancy_multiplier DECIMAL(5,2) := 1.0;
    v_competitor_multiplier DECIMAL(5,2) := 1.0;
    v_demand_multiplier DECIMAL(5,2) := 1.0;
    v_final_multiplier DECIMAL(5,2) := 1.0;
    v_calculated_price DECIMAL(10,2);
    v_pricing_factors JSONB;
    v_day_of_week INTEGER;
    v_is_weekend BOOLEAN;
    v_is_peak_season BOOLEAN;
BEGIN
    -- Get room data
    SELECT * INTO v_room_data
    FROM rooms
    WHERE id = p_room_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Room not found: %', p_room_id;
    END IF;
    
    -- Get occupancy data
    SELECT * INTO v_occupancy_data
    FROM calculate_real_time_occupancy(p_room_id, p_date);
    
    -- Get competitor average price
    SELECT AVG(cps.price) INTO v_competitor_avg
    FROM competitor_price_surveys cps
    JOIN competitor_rooms cr ON cps.competitor_room_id = cr.id
    WHERE cr.comparable_room_id = p_room_id
        AND cps.survey_date >= p_date - INTERVAL '3 days'
        AND cps.survey_date <= p_date + INTERVAL '3 days';
    
    -- Calculate time-based multipliers
    v_day_of_week := EXTRACT(DOW FROM p_date);
    v_is_weekend := v_day_of_week IN (0, 6); -- Sunday, Saturday
    v_is_peak_season := -- Define your peak season logic here
        (EXTRACT(MONTH FROM p_date) IN (6, 7, 8, 12)) OR -- Summer, December
        (EXTRACT(DAY FROM p_date) BETWEEN 20 AND 31 AND EXTRACT(MONTH FROM p_date) = 12); -- Year end
    
    -- Time multiplier based on day of week and season
    IF v_is_weekend THEN
        v_time_multiplier := 1.2;
    ELSIF v_is_peak_season THEN
        v_time_multiplier := 1.3;
    ELSE
        v_time_multiplier := 1.0;
    END IF;
    
    -- Occupancy-based multiplier (aggressive pricing)
    IF v_occupancy_data.occupancy_rate >= 95 THEN
        v_occupancy_multiplier := 1.5; -- Very high demand
    ELSIF v_occupancy_data.occupancy_rate >= 85 THEN
        v_occupancy_multiplier := 1.3; -- High demand
    ELSIF v_occupancy_data.occupancy_rate >= 70 THEN
        v_occupancy_multiplier := 1.15; -- Medium demand
    ELSIF v_occupancy_data.occupancy_rate <= 30 THEN
        v_occupancy_multiplier := 0.85; -- Low demand
    ELSE
        v_occupancy_multiplier := 1.0; -- Normal demand
    END IF;
    
    -- Competitor-based multiplier
    IF v_competitor_avg > 0 THEN
        IF v_room_data.base_price < v_competitor_avg * 0.9 THEN
            v_competitor_multiplier := 1.1; -- We're cheaper, can increase
        ELSIF v_room_data.base_price > v_competitor_avg * 1.1 THEN
            v_competitor_multiplier := 0.95; -- We're expensive, should decrease
        ELSE
            v_competitor_multiplier := 1.0; -- Competitive
        END IF;
    END IF;
    
    -- Demand score multiplier
    v_demand_multiplier := 1.0 + (v_occupancy_data.demand_score - 50) / 100;
    
    -- Apply min/max auto price constraints
    v_final_multiplier := v_time_multiplier * v_occupancy_multiplier * 
                         v_competitor_multiplier * v_demand_multiplier;
    
    -- Calculate final price
    v_calculated_price := v_room_data.base_price * v_final_multiplier;
    
    -- Apply min/max constraints
    IF v_room_data.min_auto_price IS NOT NULL AND v_calculated_price < v_room_data.min_auto_price THEN
        v_calculated_price := v_room_data.min_auto_price;
        v_final_multiplier := v_calculated_price / v_room_data.base_price;
    END IF;
    
    IF v_room_data.max_auto_price IS NOT NULL AND v_calculated_price > v_room_data.max_auto_price THEN
        v_calculated_price := v_room_data.max_auto_price;
        v_final_multiplier := v_calculated_price / v_room_data.base_price;
    END IF;
    
    -- Round to nearest 10000 (Indonesian pricing convention)
    v_calculated_price := ROUND(v_calculated_price / 10000) * 10000;
    
    -- Build pricing factors JSON
    v_pricing_factors := jsonb_build_object(
        'day_of_week', v_day_of_week,
        'is_weekend', v_is_weekend,
        'is_peak_season', v_is_peak_season,
        'occupancy_rate', v_occupancy_data.occupancy_rate,
        'demand_score', v_occupancy_data.demand_score,
        'competitor_avg', v_competitor_avg,
        'base_price', v_room_data.base_price,
        'time_multiplier', v_time_multiplier,
        'occupancy_multiplier', v_occupancy_multiplier,
        'competitor_multiplier', v_competitor_multiplier,
        'demand_multiplier', v_demand_multiplier,
        'final_multiplier', v_final_multiplier
    );
    
    -- Update cache if needed
    IF p_force_recache OR NOT EXISTS (
        SELECT 1 FROM price_cache 
        WHERE room_id = p_room_id 
            AND date = p_date 
            AND valid_until > now()
    ) THEN
        PERFORM update_price_cache(
            p_room_id, p_date, v_calculated_price, v_room_data.base_price,
            v_occupancy_data.occupancy_rate, v_competitor_avg, v_pricing_factors, 15
        );
    END IF;
    
    -- Record high-frequency price history
    INSERT INTO price_history_high_freq (
        room_id, price, base_price, occupancy_rate, competitor_avg_price,
        demand_score, trigger_event, calculation_version
    ) VALUES (
        p_room_id, v_calculated_price, v_room_data.base_price,
        v_occupancy_data.occupancy_rate, v_competitor_avg,
        v_occupancy_data.demand_score, 'real_time_calculation', 1
    );
    
    RETURN QUERY
    SELECT p_room_id, p_date, v_room_data.base_price, v_calculated_price,
           v_occupancy_data.occupancy_rate, v_demand_multiplier, v_time_multiplier,
           v_competitor_multiplier, v_final_multiplier, v_pricing_factors,
           EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::INTEGER;
END;
$$;

-- 3. Batch pricing calculation for multiple rooms
CREATE OR REPLACE FUNCTION calculate_batch_real_time_prices(
    p_room_ids UUID[] DEFAULT NULL,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    room_id UUID,
    success BOOLEAN,
    error_message TEXT,
    calculation_time_ms INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_room_id UUID;
    v_start_time TIMESTAMP WITH TIME ZONE;
    v_success BOOLEAN;
    v_error_message TEXT;
BEGIN
    -- If no room IDs provided, get all rooms with auto-pricing enabled
    IF p_room_ids IS NULL THEN
        SELECT ARRAY_AGG(id) INTO p_room_ids
        FROM rooms
        WHERE auto_pricing_enabled = true;
    END IF;
    
    -- Process each room
    FOREACH v_room_id IN ARRAY p_room_ids
    LOOP
        v_start_time := clock_timestamp();
        v_success := true;
        v_error_message := NULL;
        
        BEGIN
            -- Calculate real-time price
            PERFORM 1 FROM calculate_real_time_price(v_room_id, p_date, true);
            
            -- Record metrics
            INSERT INTO pricing_metrics (
                room_id, metric_type, metric_value, recorded_at
            ) VALUES (
                v_room_id, 'price_change', 
                (SELECT calculated_price FROM calculate_real_time_price(v_room_id, p_date)),
                now()
            );
            
        EXCEPTION WHEN OTHERS THEN
            v_success := false;
            v_error_message := SQLERRM;
        END;
        
        RETURN QUERY
        SELECT v_room_id, v_success, v_error_message,
               EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::INTEGER;
    END LOOP;
END;
$$;

-- 4. Pricing event processor (main real-time engine)
CREATE OR REPLACE FUNCTION process_pricing_events(
    p_batch_size INTEGER DEFAULT 10,
    p_max_processing_time_seconds INTEGER DEFAULT 30
)
RETURNS TABLE(
    events_processed INTEGER,
    processing_time_ms INTEGER,
    errors_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_time TIMESTAMP WITH TIME ZONE := clock_timestamp();
    v_events_processed INTEGER := 0;
    v_errors_count INTEGER := 0;
    v_event_record RECORD;
    v_timeout TIMESTAMP WITH TIME ZONE := now() + (p_max_processing_time_seconds || ' seconds')::INTERVAL;
BEGIN
    -- Process unprocessed events in priority order
    FOR v_event_record IN 
        SELECT pe.*
        FROM pricing_events pe
        WHERE pe.processed = FALSE
            AND pe.retry_count < pe.max_retries
        ORDER BY pe.priority DESC, pe.created_at ASC
        LIMIT p_batch_size
    LOOP
        BEGIN
            -- Update event as processing
            UPDATE pricing_events
            SET processing_started_at = now(),
                status = 'processing'
            WHERE id = v_event_record.id;
            
            -- Handle different event types
            CASE v_event_record.event_type
                WHEN 'booking_change' THEN
                    -- Recalculate pricing for affected room
                    PERFORM 1 FROM calculate_real_time_price(
                        v_event_record.room_id, 
                        CURRENT_DATE, 
                        true
                    );
                    
                WHEN 'occupancy_update' THEN
                    -- Update occupancy-based pricing
                    PERFORM 1 FROM calculate_real_time_price(
                        v_event_record.room_id, 
                        CURRENT_DATE, 
                        true
                    );
                    
                WHEN 'competitor_change' THEN
                    -- Update competitor-based pricing
                    PERFORM 1 FROM calculate_real_time_price(
                        v_event_record.room_id, 
                        CURRENT_DATE, 
                        true
                    );
                    
                WHEN 'time_trigger' THEN
                    -- Scheduled price recalculation
                    PERFORM 1 FROM calculate_batch_real_time_prices(
                        ARRAY[v_event_record.room_id],
                        CURRENT_DATE
                    );
                    
                WHEN 'manual_override' THEN
                    -- Manual price change - log and update cache
                    INSERT INTO price_approvals (
                        room_id, old_price, new_price, price_change_percentage,
                        status, auto_approve
                    ) VALUES (
                        v_event_record.room_id,
                        (v_event_record.event_data->>'old_base_price')::DECIMAL(10,2),
                        (v_event_record.event_data->>'new_base_price')::DECIMAL(10,2),
                        0, -- Will be calculated
                        'auto_approved',
                        true
                    );
            END CASE;
            
            -- Mark event as processed
            UPDATE pricing_events
            SET processed = TRUE,
                processing_completed_at = now(),
                status = 'completed'
            WHERE id = v_event_record.id;
            
            v_events_processed := v_events_processed + 1;
            
            -- Check timeout
            IF now() > v_timeout THEN
                EXIT;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            -- Handle errors
            v_errors_count := v_errors_count + 1;
            
            UPDATE pricing_events
            SET processed = FALSE,
                processing_completed_at = now(),
                error_message = SQLERRM,
                retry_count = retry_count + 1,
                status = CASE WHEN retry_count + 1 >= max_retries THEN 'failed' ELSE 'pending' END
            WHERE id = v_event_record.id;
        END;
    END LOOP;
    
    RETURN QUERY
    SELECT v_events_processed, 
           EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::INTEGER,
           v_errors_count;
END;
$$;

-- 5. Scheduled price update trigger
CREATE OR REPLACE FUNCTION trigger_scheduled_price_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Create time-based trigger events for all rooms with auto-pricing
    INSERT INTO pricing_events (
        event_type,
        room_id,
        event_data,
        priority
    )
    SELECT 
        'time_trigger',
        r.id,
        jsonb_build_object(
            'trigger_type', 'scheduled_update',
            'scheduled_time', now()
        ),
        3 -- Low priority for scheduled updates
    FROM rooms r
    WHERE r.auto_pricing_enabled = true
        AND r.id NOT IN (
            SELECT DISTINCT room_id 
            FROM pricing_events 
            WHERE event_type = 'time_trigger'
                AND created_at > now() - INTERVAL '5 minutes'
        );
    
    RETURN NULL;
END;
$$;

-- 6. Price approval threshold checker
CREATE OR REPLACE FUNCTION check_price_approval_threshold(
    p_room_id UUID,
    p_old_price DECIMAL(10,2),
    p_new_price DECIMAL(10,2),
    p_threshold DECIMAL(5,2) DEFAULT 10.0
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_change_percentage DECIMAL(5,2);
BEGIN
    -- Calculate percentage change
    IF p_old_price = 0 THEN
        v_change_percentage := 0;
    ELSE
        v_change_percentage := ABS((p_new_price - p_old_price) / p_old_price * 100);
    END IF;
    
    -- Return true if change exceeds threshold
    RETURN v_change_percentage > p_threshold;
END;
$$;