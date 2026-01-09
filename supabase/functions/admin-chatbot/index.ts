import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const tools = [
  {
    type: "function",
    function: {
      name: "get_availability_summary",
      description: "Cek ketersediaan semua kamar untuk rentang tanggal tertentu",
      parameters: {
        type: "object",
        properties: {
          check_in: { type: "string", description: "Tanggal check-in (YYYY-MM-DD)" },
          check_out: { type: "string", description: "Tanggal check-out (YYYY-MM-DD)" }
        },
        required: ["check_in", "check_out"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_booking_stats",
      description: "Dapatkan statistik booking untuk periode tertentu",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["today", "week", "month", "all"], description: "Periode statistik" }
        },
        required: ["period"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_bookings",
      description: "Cari booking berdasarkan nama tamu, kode booking, atau tanggal",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Nama tamu atau kode booking" },
          date_from: { type: "string", description: "Tanggal mulai (YYYY-MM-DD)" },
          date_to: { type: "string", description: "Tanggal akhir (YYYY-MM-DD)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_room_inventory",
      description: "Dapatkan daftar semua kamar dengan status dan jumlah unit",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "create_admin_booking",
      description: "Buat booking baru langsung (status confirmed)",
      parameters: {
        type: "object",
        properties: {
          guest_name: { type: "string", description: "Nama tamu" },
          guest_phone: { type: "string", description: "Nomor HP tamu" },
          guest_email: { type: "string", description: "Email tamu (opsional)" },
          room_id: { type: "string", description: "ID kamar" },
          room_number: { type: "string", description: "Nomor kamar spesifik" },
          check_in: { type: "string", description: "Tanggal check-in (YYYY-MM-DD)" },
          check_out: { type: "string", description: "Tanggal check-out (YYYY-MM-DD)" },
          num_guests: { type: "number", description: "Jumlah tamu" }
        },
        required: ["guest_name", "guest_phone", "room_id", "room_number", "check_in", "check_out", "num_guests"]
      }
    }
  }
];

async function getAvailabilitySummary(supabase: any, checkIn: string, checkOut: string) {
  // Get all rooms
  const { data: rooms, error: roomsError } = await supabase
    .from('rooms')
    .select('id, name, room_count, room_numbers, price_per_night')
    .eq('available', true);

  if (roomsError) throw roomsError;

  // Get bookings that overlap with the date range
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('room_id, allocated_room_number, check_in, check_out')
    .neq('status', 'cancelled')
    .lte('check_in', checkOut)
    .gte('check_out', checkIn);

  if (bookingsError) throw bookingsError;

  // Get blocked dates
  const { data: blockedDates, error: blockedError } = await supabase
    .from('room_unavailable_dates')
    .select('room_id, room_number, unavailable_date')
    .gte('unavailable_date', checkIn)
    .lte('unavailable_date', checkOut);

  if (blockedError) throw blockedError;

  const result = rooms.map((room: any) => {
    const roomBookings = bookings?.filter((b: any) => b.room_id === room.id) || [];
    const bookedNumbers = new Set(roomBookings.map((b: any) => b.allocated_room_number));
    const blockedNumbers = new Set(
      blockedDates?.filter((b: any) => b.room_id === room.id).map((b: any) => b.room_number) || []
    );
    
    const allNumbers = room.room_numbers || [];
    const availableNumbers = allNumbers.filter((num: string) => !bookedNumbers.has(num) && !blockedNumbers.has(num));
    
    return {
      room_name: room.name,
      total_units: room.room_count,
      available_units: availableNumbers.length,
      available_numbers: availableNumbers,
      price_per_night: room.price_per_night
    };
  });

  return {
    check_in: checkIn,
    check_out: checkOut,
    rooms: result,
    total_available: result.reduce((sum: number, r: any) => sum + r.available_units, 0),
    total_rooms: result.reduce((sum: number, r: any) => sum + r.total_units, 0)
  };
}

async function getBookingStats(supabase: any, period: string) {
  const now = new Date();
  let dateFrom: string;
  
  switch (period) {
    case 'today':
      dateFrom = now.toISOString().split('T')[0];
      break;
    case 'week':
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFrom = weekAgo.toISOString().split('T')[0];
      break;
    case 'month':
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      dateFrom = monthAgo.toISOString().split('T')[0];
      break;
    default:
      dateFrom = '2020-01-01';
  }

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('status, total_price, created_at')
    .gte('created_at', dateFrom);

  if (error) throw error;

  const stats = {
    period,
    total: bookings.length,
    confirmed: bookings.filter((b: any) => b.status === 'confirmed').length,
    cancelled: bookings.filter((b: any) => b.status === 'cancelled').length,
    pending: bookings.filter((b: any) => b.status === 'pending').length,
    total_revenue: bookings
      .filter((b: any) => b.status === 'confirmed')
      .reduce((sum: number, b: any) => sum + (b.total_price || 0), 0)
  };

  return stats;
}

async function searchBookings(supabase: any, query?: string, dateFrom?: string, dateTo?: string) {
  let queryBuilder = supabase
    .from('bookings')
    .select('id, booking_code, guest_name, guest_phone, check_in, check_out, status, total_price, rooms(name)')
    .order('created_at', { ascending: false })
    .limit(10);

  if (query) {
    queryBuilder = queryBuilder.or(`guest_name.ilike.%${query}%,booking_code.ilike.%${query}%`);
  }
  if (dateFrom) {
    queryBuilder = queryBuilder.gte('check_in', dateFrom);
  }
  if (dateTo) {
    queryBuilder = queryBuilder.lte('check_out', dateTo);
  }

  const { data, error } = await queryBuilder;
  if (error) throw error;

  return data.map((b: any) => ({
    booking_code: b.booking_code,
    guest_name: b.guest_name,
    guest_phone: b.guest_phone,
    room_name: b.rooms?.name,
    check_in: b.check_in,
    check_out: b.check_out,
    status: b.status,
    total_price: b.total_price
  }));
}

async function getRoomInventory(supabase: any) {
  const { data: rooms, error } = await supabase
    .from('rooms')
    .select('id, name, room_count, room_numbers, price_per_night, available, max_guests')
    .order('name');

  if (error) throw error;

  return rooms.map((r: any) => ({
    id: r.id,
    name: r.name,
    total_units: r.room_count,
    room_numbers: r.room_numbers || [],
    price_per_night: r.price_per_night,
    is_available: r.available,
    max_guests: r.max_guests
  }));
}

async function createAdminBooking(supabase: any, params: any) {
  const { guest_name, guest_phone, guest_email, room_id, room_number, check_in, check_out, num_guests } = params;

  // Get room details
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('name, price_per_night')
    .eq('id', room_id)
    .single();

  if (roomError) throw new Error('Kamar tidak ditemukan');

  // Calculate nights and total
  const checkInDate = new Date(check_in);
  const checkOutDate = new Date(check_out);
  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
  const totalPrice = nights * room.price_per_night;

  // Create booking
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      guest_name,
      guest_phone,
      guest_email: guest_email || `${guest_phone}@admin-booking.local`,
      room_id,
      allocated_room_number: room_number,
      check_in,
      check_out,
      num_guests,
      total_nights: nights,
      total_price: totalPrice,
      status: 'confirmed',
      booking_source: 'admin'
    })
    .select('booking_code, id')
    .single();

  if (bookingError) throw bookingError;

  return {
    success: true,
    booking_code: booking.booking_code,
    guest_name,
    room_name: room.name,
    room_number,
    check_in,
    check_out,
    nights,
    total_price: totalPrice
  };
}

async function executeTool(supabase: any, toolName: string, args: any) {
  console.log(`Executing tool: ${toolName}`, args);
  
  switch (toolName) {
    case 'get_availability_summary':
      return await getAvailabilitySummary(supabase, args.check_in, args.check_out);
    case 'get_booking_stats':
      return await getBookingStats(supabase, args.period);
    case 'search_bookings':
      return await searchBookings(supabase, args.query, args.date_from, args.date_to);
    case 'get_room_inventory':
      return await getRoomInventory(supabase);
    case 'create_admin_booking':
      return await createAdminBooking(supabase, args);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create authenticated client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify user is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await createClient(
      SUPABASE_URL,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    ).auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { messages } = await req.json();

    // Get hotel settings for context
    const { data: hotelSettings } = await supabase
      .from('hotel_settings')
      .select('hotel_name, check_in_time, check_out_time')
      .single();

    const hotelName = hotelSettings?.hotel_name || 'Hotel';
    const checkInTime = hotelSettings?.check_in_time || '14:00';
    const checkOutTime = hotelSettings?.check_out_time || '12:00';

    // Calculate WIB dates for relative date reference
    const now = new Date();
    const wibOffset = 7 * 60;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wibTime = new Date(utc + (wibOffset * 60000));
    const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 24 * 60 * 60 * 1000);
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    const today = formatDate(wibTime);
    const tomorrow = formatDate(addDays(wibTime, 1));
    const lusa = formatDate(addDays(wibTime, 2));
    const nextWeek = formatDate(addDays(wibTime, 7));

    // Calculate next weekend (Saturday)
    const currentDay = wibTime.getDay();
    const daysUntilSaturday = (6 - currentDay + 7) % 7 || 7;
    const weekend = formatDate(addDays(wibTime, daysUntilSaturday));

    const systemPrompt = `Kamu adalah Asisten Booking Admin untuk ${hotelName}.
Tugasmu membantu admin mengelola booking dengan cepat dan efisien.

Informasi hotel:
- Check-in: ${checkInTime}
- Check-out: ${checkOutTime}

📅 REFERENSI TANGGAL (WIB - Waktu Indonesia Barat):
- Hari ini: ${today}
- Besok: ${tomorrow}
- Lusa (2 hari lagi): ${lusa}
- Minggu depan: ${nextWeek}
- Weekend terdekat (Sabtu): ${weekend}

⚠️ PENTING - KONVERSI TANGGAL OTOMATIS:
Ketika admin menyebut tanggal relatif, kamu HARUS mengkonversinya ke format YYYY-MM-DD:
- "hari ini" / "malam ini" / "sekarang" → check-in: ${today}
- "besok" / "bsk" / "besuk" → check-in: ${tomorrow}
- "lusa" → check-in: ${lusa}
- "minggu depan" / "pekan depan" → check-in: ${nextWeek}
- "weekend" / "akhir pekan" / "sabtu" → check-in: ${weekend}

Default check-out adalah 1 malam setelah check-in jika tidak disebutkan.

Kamu bisa:
1. Cek ketersediaan kamar untuk tanggal tertentu (gunakan get_availability_summary)
2. Memberikan statistik booking (gunakan get_booking_stats dengan period: today/week/month/all)
3. Mencari booking berdasarkan nama tamu atau kode booking (gunakan search_bookings)
4. Melihat daftar kamar dan inventori (gunakan get_room_inventory)
5. Membuat booking baru langsung (gunakan create_admin_booking)

Gunakan bahasa Indonesia yang singkat dan jelas.
Format angka dengan Rp dan titik sebagai pemisah ribuan.
Untuk tanggal, gunakan format DD MMM YYYY (contoh: 8 Jan 2026).

Jika admin minta buat booking tapi info belum lengkap, tanyakan yang kurang.
Sebelum buat booking, selalu cek ketersediaan dulu dan konfirmasi detailnya.`;

    // Initial AI call
    let response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        tools,
        stream: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    // Process streaming response for tool calls
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let toolCalls: any[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
        
        try {
          const data = JSON.parse(line.slice(6));
          const delta = data.choices?.[0]?.delta;
          
          if (delta?.content) {
            fullContent += delta.content;
          }
          
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (tc.index !== undefined) {
                if (!toolCalls[tc.index]) {
                  toolCalls[tc.index] = { id: tc.id, function: { name: '', arguments: '' } };
                }
                if (tc.function?.name) {
                  toolCalls[tc.index].function.name = tc.function.name;
                }
                if (tc.function?.arguments) {
                  toolCalls[tc.index].function.arguments += tc.function.arguments;
                }
              }
            }
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }

    // If there are tool calls, execute them
    if (toolCalls.length > 0) {
      const toolResults = [];
      
      for (const tc of toolCalls) {
        if (!tc || !tc.function?.name) continue;
        
        try {
          const args = JSON.parse(tc.function.arguments || '{}');
          const result = await executeTool(supabase, tc.function.name, args);
          toolResults.push({
            tool_call_id: tc.id,
            role: 'tool',
            content: JSON.stringify(result)
          });
        } catch (e: any) {
          console.error('Tool execution error:', e);
          toolResults.push({
            tool_call_id: tc.id,
            role: 'tool',
            content: JSON.stringify({ error: e.message })
          });
        }
      }

      // Make final call with tool results
      const finalResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages,
            { role: 'assistant', content: fullContent || null, tool_calls: toolCalls },
            ...toolResults
          ],
          stream: true
        })
      });

      if (!finalResponse.ok) {
        throw new Error(`Final AI call failed: ${finalResponse.status}`);
      }

      return new Response(finalResponse.body, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' }
      });
    }

    // No tool calls, return original stream (re-fetch for streaming)
    const streamResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        stream: true
      })
    });

    return new Response(streamResponse.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' }
    });

  } catch (error: any) {
    console.error('Admin chatbot error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
