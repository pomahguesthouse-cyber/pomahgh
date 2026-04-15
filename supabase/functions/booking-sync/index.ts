import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const log = (level: 'info' | 'error' | 'warn', message: string, data?: Record<string, unknown>) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: 'booking-sync',
    message,
    ...data
  }));
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Booking.com credentials from channel manager
    const { data: channelManager } = await supabase
      .from('channel_managers')
      .select('*')
      .eq('ota_provider', 'booking.com')
      .eq('is_active', true)
      .maybeSingle();

    if (!channelManager) {
      return new Response(
        JSON.stringify({ error: 'Booking.com not configured. Go to /admin/booking-com to set up.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API credentials from environment
    const apiUsername = Deno.env.get('BOOKING_API_USERNAME');
    const apiPassword = Deno.env.get('BOOKING_API_PASSWORD');
    const hotelId = channelManager.booking_property_id || Deno.env.get('BOOKING_HOTEL_ID');

    if (!apiUsername || !apiPassword) {
      log('warn', 'Booking.com API credentials not configured', { requestId });
      
      // Return info about how to set up
      return new Response(
        JSON.stringify({ 
          error: 'API credentials not configured',
          message: 'To pull reservations from Booking.com, you need:',
          required: ['BOOKING_API_USERNAME', 'BOOKING_API_PASSWORD', 'BOOKING_HOTEL_ID'],
          instructions: 'Contact Booking.com to become a Connectivity Partner to get API access'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Booking.com Reservations API
    // This is a placeholder - actual endpoint depends on Booking.com's API
    const bookingApiUrl = `https://supply-xml.booking.com/json/reservations?hotel_id=${hotelId}`;
    
    const auth = btoa(`${apiUsername}:${apiPassword}`);
    
    const response = await fetch(bookingApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      log('error', 'Booking.com API error', { requestId, status: response.status, error: errorText });
      return new Response(
        JSON.stringify({ error: 'Failed to fetch reservations from Booking.com', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const reservations = await response.json();
    
    log('info', 'Fetched reservations from Booking.com', { 
      requestId, 
      count: Array.isArray(reservations) ? reservations.length : 0 
    });

    let synced = 0;
    let created = 0;
    let updated = 0;
    let errors = 0;

    // Process each reservation
    for (const res of (reservations || [])) {
      try {
        const result = await processApiReservation(supabase as any, res, requestId);
        if (result.action === 'created') created++;
        else if (result.action === 'updated') updated++;
        synced++;
      } catch (e: unknown) {
        log('error', 'Failed to process reservation', { requestId, error: (e as Error).message, reservationId: res.id });
        errors++;
      }
    }

    // Update last sync time
    await supabase
      .from('channel_managers')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: errors > 0 ? 'partial' : 'success'
      })
      .eq('id', channelManager.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced,
        created,
        updated,
        errors,
        message: `Synced ${synced} reservations from Booking.com`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const err = error as Error;
    log('error', 'Sync error', { requestId, error: err.message, stack: err.stack });
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processApiReservation(
  supabase: ReturnType<typeof createClient>,
  res: Record<string, unknown>,
  requestId: string
) {
  const bookingId = res.id?.toString() || res.reservation_id?.toString();
  const confirmationNumber = res.confirmation_number?.toString() || res.booking_id?.toString();
  
  // Check if booking exists
  const { data: existing } = await supabase
    .from('bookings')
    .select('id')
    .eq('ota_booking_id' as any, bookingId || confirmationNumber || '')
    .maybeSingle() as { data: { id: string } | null };

  // Extract guest info
  const guest = (res.guest || res.guest_info || {}) as Record<string, unknown>;
  const guestName = guest.name?.toString() || `${guest.first_name || ''} ${guest.last_name || ''}`.trim() || 'Guest';
  const guestEmail = guest.email?.toString() || '';
  const guestPhone = guest.phone?.toString() || guest.telephone?.toString() || '';

  // Extract dates
  const checkIn = res.checkin?.toString() || res.check_in_date?.toString();
  const checkOut = res.checkout?.toString() || res.check_out_date?.toString();

  // Extract room info
  const room = (res.room || res.room_type || {}) as Record<string, unknown>;
  const roomTypeName = room.name?.toString() || room.type?.toString() || '';

  // Extract price
  const totalPrice = parseFloat(res.total_price?.toString() || res.price?.toString() || '0');
  const currency = res.currency?.toString() || 'IDR';

  // Extract guest count
  const guests = parseInt(res.guests?.toString() || res.number_of_guests?.toString() || '1');

  // Status
  const status = res.status?.toString() || res.booking_status?.toString();

  if (existing) {
    // Update existing booking
    const { error } = await supabase
      .from('bookings')
      .update({
        check_in: checkIn as string,
        check_out: checkOut as string,
        total_price: totalPrice,
        status: status === 'cancelled' ? 'cancelled' : 'confirmed',
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', existing.id);

    if (error) throw error;
    
    return { action: 'updated', bookingId: existing.id };
  } else {
    // Find room
    let roomId: string | null = null;
    
    if (roomTypeName) {
      const { data: rooms } = await supabase
        .from('rooms')
        .select('id')
        .ilike('name', `%${roomTypeName}%`)
        .limit(1)
        .single() as { data: { id: string } | null };
      
      if (rooms) roomId = rooms.id;
    }

    if (!roomId) {
      const { data: firstRoom } = await supabase
        .from('rooms')
        .select('id')
        .limit(1)
        .single() as { data: { id: string } | null };
      
      if (firstRoom) roomId = firstRoom.id;
    }

    if (!roomId) throw new Error('No room available');

    // Calculate nights
    const checkInDate = new Date(checkIn as string);
    const checkOutDate = new Date(checkOut as string);
    const totalNights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

    // Create booking
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        booking_code: confirmationNumber || `BKG${Date.now().toString(36).toUpperCase()}`,
        room_id: roomId,
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone,
        check_in: checkIn,
        check_out: checkOut,
        total_nights: totalNights,
        total_price: totalPrice,
        num_guests: guests,
        status: status === 'cancelled' ? 'cancelled' : 'confirmed',
        payment_status: 'paid', // Booking.com handles payment
        booking_source: 'booking.com',
        ota_booking_id: bookingId || confirmationNumber,
        ota_name: 'booking.com'
      })
      .select()
      .single();

    if (error) throw error;

    return { action: 'created', bookingId: booking?.id };
  }
}
