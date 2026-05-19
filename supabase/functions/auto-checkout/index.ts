import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyServiceRole } from "../_shared/cronAuth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = verifyServiceRole(req);
  if (!auth.ok) {
    const body = await auth.response.text();
    return new Response(body, { status: auth.response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get current WIB time
    const now = new Date();
    const wibOffset = 7 * 60; // UTC+7 in minutes
    const wibTime = new Date(now.getTime() + (wibOffset + now.getTimezoneOffset()) * 60000);
    const todayStr = wibTime.toISOString().split('T')[0];
    const currentHour = wibTime.getHours();
    const currentMinute = wibTime.getMinutes();
    const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}:00`;

    console.log(`🕐 Auto-checkout running at WIB: ${todayStr} ${currentTimeStr}`);

    // 1. Auto-checkout bookings from PAST dates (definitely overdue)
    const { data: pastDueBookings, error: pastError } = await supabase
      .from('bookings')
      .select('id, booking_code, guest_name, check_out, check_out_time, allocated_room_number, rooms:room_id(name)')
      .in('status', ['confirmed', 'checked_in'])
      .lt('check_out', todayStr);

    if (pastError) {
      console.error('Error fetching past-due bookings:', pastError);
    }

    // 2. Auto-checkout bookings from TODAY where checkout time has passed
    const { data: todayBookings, error: todayError } = await supabase
      .from('bookings')
      .select('id, booking_code, guest_name, check_out, check_out_time, allocated_room_number, rooms:room_id(name)')
      .in('status', ['confirmed', 'checked_in'])
      .eq('check_out', todayStr);

    if (todayError) {
      console.error('Error fetching today bookings:', todayError);
    }

    // Filter today's bookings: only those past their checkout time
    const overdueToday = (todayBookings || []).filter((b: { check_out_time?: string | null }) => {
      const checkoutTime = b.check_out_time || '12:00:00';
      return currentTimeStr >= checkoutTime;
    });

    const allOverdue = [...(pastDueBookings || []), ...overdueToday];

    if (allOverdue.length === 0) {
      console.log('✅ No overdue bookings to auto-checkout');
      return new Response(
        JSON.stringify({ success: true, message: 'No overdue bookings', checked_out: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update all overdue bookings to checked_out
    const overdueIds = allOverdue.map((b: { id: string }) => b.id);
    
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ 
        status: 'checked_out', 
        updated_at: new Date().toISOString() 
      })
      .in('id', overdueIds);

    if (updateError) {
      console.error('Error updating bookings:', updateError);
      throw updateError;
    }

    // Log results
    interface OverdueBooking {
      id: string;
      booking_code: string;
      guest_name: string;
      check_out: string;
      check_out_time: string | null;
      allocated_room_number: string | null;
      rooms: { name: string } | null;
    }

    const results = (allOverdue as unknown as OverdueBooking[]).map((b) => ({
      booking_code: b.booking_code,
      guest_name: b.guest_name,
      room: `${b.rooms?.name || ''} ${b.allocated_room_number || ''}`.trim(),
      check_out: b.check_out,
      check_out_time: b.check_out_time || '12:00:00',
    }));

    console.log(`✅ Auto-checked out ${results.length} bookings:`);
    results.forEach((r) => {
      console.log(`  - ${r.booking_code} | ${r.guest_name} | ${r.room} | CO: ${r.check_out} ${r.check_out_time}`);
    });


    return new Response(
      JSON.stringify({ 
        success: true, 
        checked_out: results.length,
        bookings: results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Auto-checkout error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
