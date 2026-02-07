-- Migration: Add booking_rooms trigger for real-time pricing
-- Created: 2025-02-07
-- Purpose: Enable occupancy-based pricing triggers when booking_rooms changes

-- Function: Create pricing event when booking_rooms changes
CREATE OR REPLACE FUNCTION trigger_pricing_event_on_booking_rooms()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_room_id UUID;
    v_booking_id UUID;
    v_check_in DATE;
    v_check_out DATE;
BEGIN
    -- Get room_id and booking details
    IF TG_OP = 'DELETE' THEN
        v_room_id := OLD.room_id;
        v_booking_id := OLD.booking_id;
    ELSE
        v_room_id := NEW.room_id;
        v_booking_id := NEW.booking_id;
    END IF;
    
    -- Get booking dates
    SELECT check_in, check_out INTO v_check_in, v_check_out
    FROM bookings
    WHERE id = v_booking_id;
    
    -- Create pricing event for occupancy update
    INSERT INTO pricing_events (
        event_type,
        room_id,
        event_data,
        priority
    ) VALUES (
        'occupancy_update',
        v_room_id,
        jsonb_build_object(
            'operation', TG_OP,
            'booking_id', v_booking_id,
            'room_id', v_room_id,
            'check_in', v_check_in,
            'check_out', v_check_out,
            'trigger_table', 'booking_rooms',
            'timestamp', now()
        ),
        7 -- High priority for occupancy changes
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach trigger to booking_rooms table
DROP TRIGGER IF EXISTS booking_rooms_pricing_event_trigger ON booking_rooms;
CREATE TRIGGER booking_rooms_pricing_event_trigger
AFTER INSERT OR UPDATE OR DELETE ON booking_rooms
FOR EACH ROW
EXECUTE FUNCTION trigger_pricing_event_on_booking_rooms();

-- Add comment for documentation
COMMENT ON FUNCTION trigger_pricing_event_on_booking_rooms() IS 
'Triggers pricing recalculation when booking_rooms table changes. High priority (7) to ensure fast reaction to occupancy changes.';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_booking_rooms_room_id ON booking_rooms(room_id);
CREATE INDEX IF NOT EXISTS idx_booking_rooms_booking_id ON booking_rooms(booking_id);

-- Verify trigger was created
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'booking_rooms_pricing_event_trigger'
    ) THEN
        RAISE NOTICE '✅ booking_rooms pricing trigger created successfully';
    ELSE
        RAISE EXCEPTION '❌ Failed to create booking_rooms pricing trigger';
    END IF;
END;
$$;
