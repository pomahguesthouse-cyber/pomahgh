import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_URL = "https://ai.gateway.lovable.dev/v1";

// Tool definitions
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
      name: "get_recent_bookings",
      description: "Dapatkan daftar booking terbaru. Gunakan ini untuk perintah seperti 'tampilkan 5 booking terakhir', 'lihat 10 booking terbaru', atau 'booking terakhir'",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Jumlah booking yang ditampilkan (default: 5, max: 20)" },
          status: { type: "string", enum: ["all", "confirmed", "pending", "cancelled"], description: "Filter status (default: all)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_bookings",
      description: "Cari booking berdasarkan nama tamu atau kode booking. Gunakan ini untuk perintah seperti 'cari booking atas nama Budi', 'booking dari Ahmad', atau 'cari kode ABC123'",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Nama tamu atau kode booking untuk dicari" },
          date_from: { type: "string", description: "Tanggal mulai (YYYY-MM-DD)" },
          date_to: { type: "string", description: "Tanggal akhir (YYYY-MM-DD)" },
          limit: { type: "number", description: "Jumlah hasil maksimal (default: 10, max: 50)" }
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
  },
  {
    type: "function",
    function: {
      name: "update_room_price",
      description: "Update harga kamar. Gunakan untuk mengubah harga utama, harga per hari (Senin-Minggu), atau harga promo. Contoh: 'ubah harga Deluxe jadi 350000', 'set harga weekend Villa 500000', 'buat promo Superior 275000'",
      parameters: {
        type: "object",
        properties: {
          room_name: { type: "string", description: "Nama kamar (contoh: 'Deluxe', 'Superior', 'Villa')" },
          price_type: { 
            type: "string", 
            enum: ["main", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "weekday", "weekend", "promo"],
            description: "Jenis harga: 'main' untuk harga utama, nama hari untuk harga harian, 'weekday' untuk Senin-Jumat, 'weekend' untuk Sabtu-Minggu, 'promo' untuk harga promo"
          },
          new_price: { type: "number", description: "Harga baru dalam Rupiah" },
          promo_start_date: { type: "string", description: "Tanggal mulai promo (YYYY-MM-DD), hanya untuk price_type='promo'" },
          promo_end_date: { type: "string", description: "Tanggal akhir promo (YYYY-MM-DD), hanya untuk price_type='promo'" }
        },
        required: ["room_name", "price_type", "new_price"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_room_prices",
      description: "Lihat daftar harga kamar saat ini termasuk harga utama, harga per hari, dan promo aktif",
      parameters: {
        type: "object",
        properties: {
          room_name: { type: "string", description: "Nama kamar spesifik (opsional, kosongkan untuk semua kamar)" }
        }
      }
    }
  },
  // ===== BOOKING UPDATE TOOLS =====
  {
    type: "function",
    function: {
      name: "get_booking_detail",
      description: "Lihat detail lengkap satu booking berdasarkan kode booking. Gunakan untuk 'detail booking', 'info booking ABC', 'cek booking XYZ'",
      parameters: {
        type: "object",
        properties: {
          booking_code: { type: "string", description: "Kode booking untuk dicari (contoh: BK-XXXX)" }
        },
        required: ["booking_code"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_booking_status",
      description: "Ubah status booking (confirm, cancel, pending). Gunakan untuk 'batalkan booking', 'konfirmasi booking', atau 'ubah status booking'",
      parameters: {
        type: "object",
        properties: {
          booking_code: { type: "string", description: "Kode booking (contoh: BK-XXXX)" },
          new_status: { 
            type: "string", 
            enum: ["confirmed", "pending", "cancelled"],
            description: "Status baru: confirmed, pending, atau cancelled"
          },
          cancellation_reason: { type: "string", description: "Alasan pembatalan (opsional, hanya untuk cancelled)" }
        },
        required: ["booking_code", "new_status"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_guest_info",
      description: "Edit informasi tamu seperti nama, nomor HP, atau email. Gunakan untuk 'ubah nama tamu', 'ganti nomor HP booking', 'edit email tamu'",
      parameters: {
        type: "object",
        properties: {
          booking_code: { type: "string", description: "Kode booking" },
          guest_name: { type: "string", description: "Nama tamu baru (opsional)" },
          guest_phone: { type: "string", description: "Nomor HP baru (opsional)" },
          guest_email: { type: "string", description: "Email baru (opsional)" },
          num_guests: { type: "number", description: "Jumlah tamu baru (opsional)" }
        },
        required: ["booking_code"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "reschedule_booking",
      description: "Ubah tanggal check-in dan/atau check-out booking. Gunakan untuk 'reschedule', 'ubah tanggal', 'pindah jadwal booking'",
      parameters: {
        type: "object",
        properties: {
          booking_code: { type: "string", description: "Kode booking" },
          new_check_in: { type: "string", description: "Tanggal check-in baru (YYYY-MM-DD)" },
          new_check_out: { type: "string", description: "Tanggal check-out baru (YYYY-MM-DD)" }
        },
        required: ["booking_code"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "change_booking_room",
      description: "Pindahkan booking ke kamar lain. Gunakan untuk 'ganti kamar', 'pindah ke kamar X', 'upgrade kamar'",
      parameters: {
        type: "object",
        properties: {
          booking_code: { type: "string", description: "Kode booking" },
          new_room_name: { type: "string", description: "Nama tipe kamar baru (contoh: Deluxe, Superior, Villa)" },
          new_room_number: { type: "string", description: "Nomor kamar spesifik (contoh: A1, B2)" }
        },
        required: ["booking_code", "new_room_name", "new_room_number"]
      }
    }
  }
];

// Helper function for smart room matching (prioritized)
function findBestRoomMatch(searchName: string, rooms: any[]): any | null {
  const normalizeRoomName = (name: string) => {
    return name
      .toLowerCase()
      .replace(/\b(room|kamar|suite)\b/gi, '')
      .trim();
  };
  
  const normalizedSearch = normalizeRoomName(searchName);
  console.log(`Room matching: searching for "${searchName}" -> normalized: "${normalizedSearch}"`);
  
  // Priority 1: Exact match (highest priority)
  const exactMatch = rooms.find(r => 
    normalizeRoomName(r.name) === normalizedSearch
  );
  if (exactMatch) {
    console.log(`Room matching: EXACT match found -> "${exactMatch.name}"`);
    return exactMatch;
  }
  
  // Priority 2: Starts with (e.g., "deluxe" matches "deluxe room" but NOT "grand deluxe")
  const startsWithMatch = rooms.find(r => 
    normalizeRoomName(r.name).startsWith(normalizedSearch)
  );
  if (startsWithMatch) {
    console.log(`Room matching: STARTS WITH match found -> "${startsWithMatch.name}"`);
    return startsWithMatch;
  }
  
  // Priority 3: Contains (fallback for partial matches)
  const containsMatch = rooms.find(r => {
    const normalized = normalizeRoomName(r.name);
    return normalized.includes(normalizedSearch) || normalizedSearch.includes(normalized);
  });
  if (containsMatch) {
    console.log(`Room matching: CONTAINS match found -> "${containsMatch.name}"`);
    return containsMatch;
  }
  
  console.log(`Room matching: NO match found for "${searchName}"`);
  return null;
}

// Tool implementations
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
      blockedDates?.filter((d: any) => d.room_id === room.id).map((d: any) => d.room_number) || []
    );

    const allNumbers = room.room_numbers || [];
    const availableNumbers = allNumbers.filter(
      (num: string) => !bookedNumbers.has(num) && !blockedNumbers.has(num)
    );

    return {
      room_name: room.name,
      total_units: room.room_count,
      available_units: availableNumbers.length,
      available_room_numbers: availableNumbers,
      price_per_night: room.price_per_night,
      booked_numbers: Array.from(bookedNumbers),
      blocked_numbers: Array.from(blockedNumbers)
    };
  });

  return {
    check_in: checkIn,
    check_out: checkOut,
    rooms: result,
    total_available: result.reduce((sum: number, r: any) => sum + r.available_units, 0)
  };
}

async function getBookingStats(supabase: any, period: string) {
  const now = new Date();
  const wibOffset = 7 * 60;
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const wibTime = new Date(utc + (wibOffset * 60000));
  const today = wibTime.toISOString().split('T')[0];

  let query = supabase.from('bookings').select('id, status, total_price, created_at');

  if (period === 'today') {
    query = query.eq('created_at::date', today);
  } else if (period === 'week') {
    const weekAgo = new Date(wibTime.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    query = query.gte('created_at', weekAgo);
  } else if (period === 'month') {
    const monthAgo = new Date(wibTime.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    query = query.gte('created_at', monthAgo);
  }

  const { data: bookings, error } = await query;
  if (error) throw error;

  const stats = {
    total_bookings: bookings?.length || 0,
    confirmed: bookings?.filter((b: any) => b.status === 'confirmed').length || 0,
    pending: bookings?.filter((b: any) => b.status === 'pending').length || 0,
    cancelled: bookings?.filter((b: any) => b.status === 'cancelled').length || 0,
    total_revenue: bookings?.filter((b: any) => b.status === 'confirmed')
      .reduce((sum: number, b: any) => sum + (b.total_price || 0), 0) || 0
  };

  return { period, ...stats };
}

async function getRecentBookings(supabase: any, limit: number = 5, status?: string) {
  const actualLimit = Math.min(Math.max(limit || 5, 1), 20);
  
  let queryBuilder = supabase
    .from('bookings')
    .select('id, booking_code, guest_name, guest_phone, check_in, check_out, status, total_price, created_at, rooms(name)')
    .order('created_at', { ascending: false })
    .limit(actualLimit);

  if (status && status !== 'all') {
    queryBuilder = queryBuilder.eq('status', status);
  }

  const { data, error } = await queryBuilder;
  if (error) throw error;

  return {
    count: data.length,
    bookings: data.map((b: any) => ({
      booking_code: b.booking_code,
      guest_name: b.guest_name,
      guest_phone: b.guest_phone,
      room_name: b.rooms?.name,
      check_in: b.check_in,
      check_out: b.check_out,
      status: b.status,
      total_price: b.total_price,
      created_at: b.created_at
    }))
  };
}

async function searchBookings(supabase: any, query?: string, dateFrom?: string, dateTo?: string, limit: number = 10) {
  const actualLimit = Math.min(Math.max(limit || 10, 1), 50);
  
  let queryBuilder = supabase
    .from('bookings')
    .select('id, booking_code, guest_name, guest_phone, check_in, check_out, status, total_price, created_at, rooms(name)')
    .order('created_at', { ascending: false })
    .limit(actualLimit);

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

  return {
    query: query || null,
    count: data?.length || 0,
    bookings: data?.map((b: any) => ({
      booking_code: b.booking_code,
      guest_name: b.guest_name,
      guest_phone: b.guest_phone,
      room_name: b.rooms?.name,
      check_in: b.check_in,
      check_out: b.check_out,
      status: b.status,
      total_price: b.total_price
    })) || []
  };
}

async function getRoomInventory(supabase: any) {
  const { data: rooms, error } = await supabase
    .from('rooms')
    .select('id, name, room_count, room_numbers, available, price_per_night, max_guests')
    .order('name');

  if (error) throw error;

  return {
    total_room_types: rooms?.length || 0,
    rooms: rooms?.map((r: any) => ({
      id: r.id,
      name: r.name,
      status: r.available ? 'Tersedia' : 'Tidak Tersedia',
      total_units: r.room_count,
      room_numbers: r.room_numbers || [],
      price_per_night: r.price_per_night,
      max_guests: r.max_guests
    })) || []
  };
}

async function createAdminBooking(supabase: any, args: any) {
  // Get room data
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id, name, price_per_night, room_numbers')
    .eq('id', args.room_id)
    .single();

  if (roomError || !room) {
    throw new Error('Kamar tidak ditemukan');
  }

  // Validate room number
  if (!room.room_numbers?.includes(args.room_number)) {
    throw new Error(`Nomor kamar ${args.room_number} tidak valid untuk ${room.name}`);
  }

  // Calculate nights
  const checkIn = new Date(args.check_in);
  const checkOut = new Date(args.check_out);
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

  if (nights <= 0) {
    throw new Error('Tanggal check-out harus setelah check-in');
  }

  const totalPrice = room.price_per_night * nights;

  // Create booking
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      room_id: args.room_id,
      allocated_room_number: args.room_number,
      guest_name: args.guest_name,
      guest_phone: args.guest_phone,
      guest_email: args.guest_email || `${args.guest_phone}@guest.local`,
      check_in: args.check_in,
      check_out: args.check_out,
      num_guests: args.num_guests,
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
    guest_name: args.guest_name,
    room_name: room.name,
    room_number: args.room_number,
    check_in: args.check_in,
    check_out: args.check_out,
    nights: nights,
    total_price: totalPrice
  };
}

async function updateRoomPrice(supabase: any, args: any) {
  const { room_name, price_type, new_price, promo_start_date, promo_end_date } = args;

  // Fetch all rooms first for smart matching
  const { data: allRooms, error: findError } = await supabase
    .from('rooms')
    .select('id, name, price_per_night, monday_price, tuesday_price, wednesday_price, thursday_price, friday_price, saturday_price, sunday_price, promo_price, promo_start_date, promo_end_date');

  if (findError) throw findError;

  // Use smart matching to find the best room
  const room = findBestRoomMatch(room_name, allRooms || []);

  if (!room) {
    const roomList = allRooms?.map((r: any) => r.name).join(', ') || 'tidak ada';
    throw new Error(`Kamar "${room_name}" tidak ditemukan. Kamar yang tersedia: ${roomList}`);
  }
  const updateData: any = { updated_at: new Date().toISOString() };
  let priceFields: string[] = [];

  switch (price_type) {
    case 'main':
      updateData.price_per_night = new_price;
      priceFields = ['Harga Utama'];
      break;
    case 'monday':
      updateData.monday_price = new_price;
      priceFields = ['Harga Senin'];
      break;
    case 'tuesday':
      updateData.tuesday_price = new_price;
      priceFields = ['Harga Selasa'];
      break;
    case 'wednesday':
      updateData.wednesday_price = new_price;
      priceFields = ['Harga Rabu'];
      break;
    case 'thursday':
      updateData.thursday_price = new_price;
      priceFields = ['Harga Kamis'];
      break;
    case 'friday':
      updateData.friday_price = new_price;
      priceFields = ['Harga Jumat'];
      break;
    case 'saturday':
      updateData.saturday_price = new_price;
      priceFields = ['Harga Sabtu'];
      break;
    case 'sunday':
      updateData.sunday_price = new_price;
      priceFields = ['Harga Minggu'];
      break;
    case 'weekday':
      updateData.monday_price = new_price;
      updateData.tuesday_price = new_price;
      updateData.wednesday_price = new_price;
      updateData.thursday_price = new_price;
      updateData.friday_price = new_price;
      priceFields = ['Harga Weekday (Senin-Jumat)'];
      break;
    case 'weekend':
      updateData.saturday_price = new_price;
      updateData.sunday_price = new_price;
      priceFields = ['Harga Weekend (Sabtu-Minggu)'];
      break;
    case 'promo':
      updateData.promo_price = new_price;
      if (promo_start_date) updateData.promo_start_date = promo_start_date;
      if (promo_end_date) updateData.promo_end_date = promo_end_date;
      priceFields = ['Harga Promo'];
      break;
    default:
      throw new Error(`Jenis harga "${price_type}" tidak valid`);
  }

  // Perform update
  const { error: updateError } = await supabase
    .from('rooms')
    .update(updateData)
    .eq('id', room.id);

  if (updateError) throw updateError;

  // Get the old price for comparison
  let oldPrice: number | null = null;
  switch (price_type) {
    case 'main': oldPrice = room.price_per_night; break;
    case 'monday': oldPrice = room.monday_price; break;
    case 'tuesday': oldPrice = room.tuesday_price; break;
    case 'wednesday': oldPrice = room.wednesday_price; break;
    case 'thursday': oldPrice = room.thursday_price; break;
    case 'friday': oldPrice = room.friday_price; break;
    case 'saturday': oldPrice = room.saturday_price; break;
    case 'sunday': oldPrice = room.sunday_price; break;
    case 'weekday': oldPrice = room.monday_price; break;
    case 'weekend': oldPrice = room.saturday_price; break;
    case 'promo': oldPrice = room.promo_price; break;
  }

  const result: any = {
    success: true,
    room_name: room.name,
    price_type: priceFields.join(', '),
    old_price: oldPrice,
    new_price: new_price
  };

  if (price_type === 'promo' && (promo_start_date || promo_end_date)) {
    result.promo_start_date = promo_start_date || room.promo_start_date;
    result.promo_end_date = promo_end_date || room.promo_end_date;
  }

  return result;
}

async function getRoomPrices(supabase: any, roomName?: string) {
  // Fetch all rooms first
  const { data: allRooms, error } = await supabase
    .from('rooms')
    .select('id, name, price_per_night, monday_price, tuesday_price, wednesday_price, thursday_price, friday_price, saturday_price, sunday_price, promo_price, promo_start_date, promo_end_date')
    .order('name');

  if (error) throw error;

  if (!allRooms || allRooms.length === 0) {
    throw new Error('Tidak ada kamar yang ditemukan');
  }

  let rooms = allRooms;

  // If specific room name requested, use smart matching
  if (roomName) {
    const matchedRoom = findBestRoomMatch(roomName, allRooms);
    if (!matchedRoom) {
      const roomList = allRooms.map((r: any) => r.name).join(', ');
      throw new Error(`Kamar "${roomName}" tidak ditemukan. Kamar yang tersedia: ${roomList}`);
    }
    rooms = [matchedRoom];
  }

  return {
    count: rooms.length,
    rooms: rooms.map((r: any) => {
      const today = new Date().toISOString().split('T')[0];
      const hasActivePromo = r.promo_price && r.promo_start_date && r.promo_end_date 
        && r.promo_start_date <= today && r.promo_end_date >= today;

      return {
        name: r.name,
        price_per_night: r.price_per_night,
        daily_prices: {
          senin: r.monday_price || r.price_per_night,
          selasa: r.tuesday_price || r.price_per_night,
          rabu: r.wednesday_price || r.price_per_night,
          kamis: r.thursday_price || r.price_per_night,
          jumat: r.friday_price || r.price_per_night,
          sabtu: r.saturday_price || r.price_per_night,
          minggu: r.sunday_price || r.price_per_night
        },
        promo: r.promo_price ? {
          price: r.promo_price,
          start_date: r.promo_start_date,
          end_date: r.promo_end_date,
          is_active: hasActivePromo
        } : null
      };
    })
  };
}

// ===== BOOKING UPDATE IMPLEMENTATIONS =====

async function getBookingDetail(supabase: any, bookingCode: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, rooms(name, price_per_night, max_guests)')
    .eq('booking_code', bookingCode)
    .single();

  if (error || !data) {
    throw new Error(`Booking ${bookingCode} tidak ditemukan`);
  }

  return {
    booking_code: data.booking_code,
    status: data.status,
    guest: {
      name: data.guest_name,
      phone: data.guest_phone,
      email: data.guest_email,
      count: data.num_guests
    },
    room: {
      name: data.rooms?.name,
      number: data.allocated_room_number,
      price_per_night: data.rooms?.price_per_night,
      max_guests: data.rooms?.max_guests
    },
    dates: {
      check_in: data.check_in,
      check_out: data.check_out,
      nights: data.total_nights
    },
    payment: {
      total_price: data.total_price,
      payment_status: data.payment_status,
      payment_amount: data.payment_amount
    },
    booking_source: data.booking_source,
    special_requests: data.special_requests,
    created_at: data.created_at
  };
}

async function updateBookingStatus(supabase: any, bookingCode: string, newStatus: string, reason?: string) {
  // Find booking
  const { data: booking, error: findError } = await supabase
    .from('bookings')
    .select('id, booking_code, guest_name, status, special_requests, rooms(name)')
    .eq('booking_code', bookingCode)
    .single();

  if (findError || !booking) {
    throw new Error(`Booking ${bookingCode} tidak ditemukan`);
  }

  const oldStatus = booking.status;

  // Prepare update data
  const updateData: any = { 
    status: newStatus,
    updated_at: new Date().toISOString()
  };

  // If cancelling, append reason to special_requests
  if (newStatus === 'cancelled' && reason) {
    const existingRequests = booking.special_requests || '';
    updateData.special_requests = `[DIBATALKAN: ${reason}] ${existingRequests}`.trim();
  }

  // Update status
  const { error: updateError } = await supabase
    .from('bookings')
    .update(updateData)
    .eq('id', booking.id);

  if (updateError) throw updateError;

  return {
    success: true,
    booking_code: bookingCode,
    guest_name: booking.guest_name,
    room_name: booking.rooms?.name,
    old_status: oldStatus,
    new_status: newStatus,
    cancellation_reason: reason || null
  };
}

async function updateGuestInfo(supabase: any, args: any) {
  const { booking_code, guest_name, guest_phone, guest_email, num_guests } = args;

  // Find booking
  const { data: booking, error: findError } = await supabase
    .from('bookings')
    .select('id, guest_name, guest_phone, guest_email, num_guests')
    .eq('booking_code', booking_code)
    .single();

  if (findError || !booking) {
    throw new Error(`Booking ${booking_code} tidak ditemukan`);
  }

  const updateData: any = { updated_at: new Date().toISOString() };
  const changes: string[] = [];

  if (guest_name && guest_name !== booking.guest_name) {
    updateData.guest_name = guest_name;
    changes.push(`Nama: ${booking.guest_name} → ${guest_name}`);
  }
  if (guest_phone && guest_phone !== booking.guest_phone) {
    updateData.guest_phone = guest_phone;
    changes.push(`HP: ${booking.guest_phone || '-'} → ${guest_phone}`);
  }
  if (guest_email && guest_email !== booking.guest_email) {
    updateData.guest_email = guest_email;
    changes.push(`Email: ${booking.guest_email || '-'} → ${guest_email}`);
  }
  if (num_guests && num_guests !== booking.num_guests) {
    updateData.num_guests = num_guests;
    changes.push(`Jumlah tamu: ${booking.num_guests} → ${num_guests}`);
  }

  if (changes.length === 0) {
    return { success: true, booking_code, message: 'Tidak ada perubahan data' };
  }

  const { error: updateError } = await supabase
    .from('bookings')
    .update(updateData)
    .eq('id', booking.id);

  if (updateError) throw updateError;

  return { success: true, booking_code, changes };
}

async function rescheduleBooking(supabase: any, args: any) {
  const { booking_code, new_check_in, new_check_out } = args;

  if (!new_check_in && !new_check_out) {
    throw new Error('Harus menyertakan new_check_in atau new_check_out');
  }

  // Find booking with room info
  const { data: booking, error: findError } = await supabase
    .from('bookings')
    .select('id, check_in, check_out, room_id, allocated_room_number, rooms(price_per_night)')
    .eq('booking_code', booking_code)
    .single();

  if (findError || !booking) {
    throw new Error(`Booking ${booking_code} tidak ditemukan`);
  }

  const checkIn = new_check_in || booking.check_in;
  const checkOut = new_check_out || booking.check_out;

  // Validate dates
  if (new Date(checkOut) <= new Date(checkIn)) {
    throw new Error('Tanggal check-out harus setelah check-in');
  }

  // Check for conflicts (other bookings in the same room during new dates)
  const { data: conflicts } = await supabase
    .from('bookings')
    .select('id, booking_code')
    .eq('room_id', booking.room_id)
    .eq('allocated_room_number', booking.allocated_room_number)
    .neq('id', booking.id)
    .neq('status', 'cancelled')
    .lt('check_in', checkOut)
    .gt('check_out', checkIn);

  if (conflicts && conflicts.length > 0) {
    throw new Error(`Tanggal baru bentrok dengan booking lain (${conflicts[0].booking_code}) di kamar yang sama`);
  }

  // Check blocked dates
  const { data: blockedDates } = await supabase
    .from('room_unavailable_dates')
    .select('unavailable_date')
    .eq('room_id', booking.room_id)
    .eq('room_number', booking.allocated_room_number)
    .gte('unavailable_date', checkIn)
    .lte('unavailable_date', checkOut);

  if (blockedDates && blockedDates.length > 0) {
    throw new Error(`Kamar diblokir pada tanggal: ${blockedDates.map((d: any) => d.unavailable_date).join(', ')}`);
  }

  // Calculate new nights and price
  const nights = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
  const totalPrice = booking.rooms?.price_per_night * nights;

  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      check_in: checkIn,
      check_out: checkOut,
      total_nights: nights,
      total_price: totalPrice,
      updated_at: new Date().toISOString()
    })
    .eq('id', booking.id);

  if (updateError) throw updateError;

  return {
    success: true,
    booking_code,
    old_dates: { check_in: booking.check_in, check_out: booking.check_out },
    new_dates: { check_in: checkIn, check_out: checkOut },
    new_nights: nights,
    new_total_price: totalPrice
  };
}

async function changeBookingRoom(supabase: any, args: any) {
  const { booking_code, new_room_name, new_room_number } = args;

  // Find booking
  const { data: booking, error: findError } = await supabase
    .from('bookings')
    .select('id, room_id, allocated_room_number, check_in, check_out, total_nights, rooms(name)')
    .eq('booking_code', booking_code)
    .single();

  if (findError || !booking) {
    throw new Error(`Booking ${booking_code} tidak ditemukan`);
  }

  // Find new room using smart matching
  const { data: allRooms } = await supabase.from('rooms').select('*');
  const newRoom = findBestRoomMatch(new_room_name, allRooms || []);

  if (!newRoom) {
    const roomList = allRooms?.map((r: any) => r.name).join(', ') || 'tidak ada';
    throw new Error(`Kamar "${new_room_name}" tidak ditemukan. Kamar yang tersedia: ${roomList}`);
  }

  if (!newRoom.room_numbers?.includes(new_room_number)) {
    throw new Error(`Nomor kamar ${new_room_number} tidak ada di ${newRoom.name}. Tersedia: ${newRoom.room_numbers?.join(', ') || 'tidak ada'}`);
  }

  // Check availability for new room
  const { data: conflicts } = await supabase
    .from('bookings')
    .select('id, booking_code')
    .eq('room_id', newRoom.id)
    .eq('allocated_room_number', new_room_number)
    .neq('id', booking.id)
    .neq('status', 'cancelled')
    .lt('check_in', booking.check_out)
    .gt('check_out', booking.check_in);

  if (conflicts && conflicts.length > 0) {
    throw new Error(`Kamar ${newRoom.name} ${new_room_number} tidak tersedia (bentrok dengan ${conflicts[0].booking_code})`);
  }

  // Check blocked dates for new room
  const { data: blockedDates } = await supabase
    .from('room_unavailable_dates')
    .select('unavailable_date')
    .eq('room_id', newRoom.id)
    .eq('room_number', new_room_number)
    .gte('unavailable_date', booking.check_in)
    .lte('unavailable_date', booking.check_out);

  if (blockedDates && blockedDates.length > 0) {
    throw new Error(`Kamar ${newRoom.name} ${new_room_number} diblokir pada tanggal: ${blockedDates.map((d: any) => d.unavailable_date).join(', ')}`);
  }

  // Calculate new price
  const newTotalPrice = newRoom.price_per_night * booking.total_nights;

  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      room_id: newRoom.id,
      allocated_room_number: new_room_number,
      total_price: newTotalPrice,
      updated_at: new Date().toISOString()
    })
    .eq('id', booking.id);

  if (updateError) throw updateError;

  return {
    success: true,
    booking_code,
    old_room: { name: booking.rooms?.name, number: booking.allocated_room_number },
    new_room: { name: newRoom.name, number: new_room_number },
    old_total_price: booking.rooms?.price_per_night * booking.total_nights,
    new_total_price: newTotalPrice,
    price_difference: newTotalPrice - (booking.rooms?.price_per_night || 0) * booking.total_nights
  };
}

async function executeTool(supabase: any, toolName: string, args: any) {
  console.log(`Executing tool: ${toolName}`, args);
  
  switch (toolName) {
    case 'get_availability_summary':
      return await getAvailabilitySummary(supabase, args.check_in, args.check_out);
    case 'get_booking_stats':
      return await getBookingStats(supabase, args.period);
    case 'get_recent_bookings':
      return await getRecentBookings(supabase, args.limit, args.status);
    case 'search_bookings':
      return await searchBookings(supabase, args.query, args.date_from, args.date_to, args.limit);
    case 'get_room_inventory':
      return await getRoomInventory(supabase);
    case 'create_admin_booking':
      return await createAdminBooking(supabase, args);
    case 'update_room_price':
      return await updateRoomPrice(supabase, args);
    case 'get_room_prices':
      return await getRoomPrices(supabase, args.room_name);
    // Booking update tools
    case 'get_booking_detail':
      return await getBookingDetail(supabase, args.booking_code);
    case 'update_booking_status':
      return await updateBookingStatus(supabase, args.booking_code, args.new_status, args.cancellation_reason);
    case 'update_guest_info':
      return await updateGuestInfo(supabase, args);
    case 'reschedule_booking':
      return await rescheduleBooking(supabase, args);
    case 'change_booking_room':
      return await changeBookingRoom(supabase, args);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if request is from WhatsApp (internal service call)
    const isWhatsAppSource = req.headers.get("X-WhatsApp-Source") === "true";
    const whatsappPhone = req.headers.get("X-WhatsApp-Phone");
    const managerName = req.headers.get("X-Manager-Name") || "Manager";

    let isAuthorized = false;
    let adminId: string | null = null;
    let adminEmail: string | null = null;

    if (isWhatsAppSource && whatsappPhone) {
      // WhatsApp source - validate phone is in manager list
      console.log(`WhatsApp source request from phone: ${whatsappPhone}, manager: ${managerName}`);
      
      const { data: hotelSettings } = await supabase
        .from('hotel_settings')
        .select('whatsapp_manager_numbers')
        .single();
      
      const managerNumbers: Array<{phone: string; name: string}> = hotelSettings?.whatsapp_manager_numbers || [];
      isAuthorized = managerNumbers.some(m => m.phone === whatsappPhone);
      
      if (!isAuthorized) {
        console.log(`Phone ${whatsappPhone} not in manager list`);
        return new Response(JSON.stringify({ error: "Not a registered manager" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // For WhatsApp managers, use phone as ID and manager name as email
      adminId = `whatsapp_${whatsappPhone}`;
      adminEmail = `${managerName} (WhatsApp: ${whatsappPhone})`;
      console.log(`✅ WhatsApp manager authorized: ${managerName} (${whatsappPhone})`);
    } else {
      // Web source - verify admin authentication via JWT
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (!adminRole) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      adminId = user.id;
      adminEmail = user.email || null;
      isAuthorized = true;
    }

    const { messages } = await req.json();

    // Get hotel settings for context
    const { data: hotelSettings } = await supabase
      .from('hotel_settings')
      .select('hotel_name, check_in_time, check_out_time')
      .single();

    // Get admin persona settings
    const { data: chatbotSettings } = await supabase
      .from('chatbot_settings')
      .select('admin_persona_name, admin_persona_role, admin_persona_traits, admin_communication_style, admin_language_formality, admin_emoji_usage, admin_custom_instructions, admin_greeting_template')
      .single();

    const hotelName = hotelSettings?.hotel_name || 'Hotel';
    const checkInTime = hotelSettings?.check_in_time || '14:00';
    const checkOutTime = hotelSettings?.check_out_time || '12:00';

    // Admin persona settings with defaults
    const adminPersonaName = chatbotSettings?.admin_persona_name || 'Rani Admin';
    const adminPersonaRole = chatbotSettings?.admin_persona_role || 'Booking Manager Assistant';
    const adminPersonaTraits: string[] = chatbotSettings?.admin_persona_traits || ['efisien', 'informatif', 'proaktif'];
    const adminCommStyle = chatbotSettings?.admin_communication_style || 'santai-profesional';
    const adminFormality = chatbotSettings?.admin_language_formality || 'informal';
    const adminEmojiUsage = chatbotSettings?.admin_emoji_usage || 'minimal';
    const adminCustomInstructions = chatbotSettings?.admin_custom_instructions || '';
    const adminGreetingTemplate = chatbotSettings?.admin_greeting_template || 'Halo {manager_name}! Ada yang bisa saya bantu hari ini?';

    // Build persona description from traits
    const traitDescriptions: Record<string, string> = {
      efisien: 'bekerja cepat dan tidak berputar-putar',
      informatif: 'memberikan informasi lengkap dan akurat',
      proaktif: 'menawarkan bantuan lebih sebelum diminta',
      ringkas: 'menyampaikan poin-poin penting saja',
      sigap: 'merespon dengan cepat dan tepat',
      cekatan: 'menyelesaikan tugas dengan tangkas',
      teliti: 'memperhatikan detail dengan cermat',
      responsif: 'langsung merespon kebutuhan pengelola'
    };
    const traitsText = adminPersonaTraits.map(t => traitDescriptions[t] || t).join(', ');

    // Communication style mapping
    const styleMap: Record<string, string> = {
      'santai-profesional': 'Gunakan bahasa akrab tapi tetap profesional, tidak kaku',
      'formal': 'Gunakan bahasa formal dan profesional',
      'santai': 'Gunakan bahasa santai dan akrab seperti teman'
    };

    // Formality mapping
    const formalityMap: Record<string, string> = {
      'informal': 'kamu/aku (akrab)',
      'semiformal': 'Anda/Saya',
      'formal': 'Bapak/Ibu (hormat)'
    };

    // Emoji usage mapping
    const emojiMap: Record<string, string> = {
      'minimal': 'Gunakan emoji hanya sesekali untuk poin penting',
      'sedang': 'Gunakan emoji secukupnya di poin-poin penting',
      'tidak': 'Jangan gunakan emoji sama sekali'
    };

    // Calculate dates in WIB
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

    // Generate personalized greeting for first message
    const personalizedGreeting = adminGreetingTemplate.replace('{manager_name}', managerName);
    
    // Check if this is likely a greeting/first message
    const isGreeting = messages.length <= 1;
    const greetingContext = isGreeting ? `

🎉 INI ADALAH PESAN PERTAMA DARI ${managerName.toUpperCase()}!
Sapa dengan hangat menggunakan nama mereka: "${personalizedGreeting}"
` : '';

    const systemPrompt = `Kamu adalah ${adminPersonaName}, ${adminPersonaRole} untuk ${hotelName}.

👤 KAMU SEDANG BERBICARA DENGAN: ${managerName}
${greetingContext}
🎭 KEPRIBADIAN:
Kamu adalah asisten yang ${traitsText}.

💬 GAYA KOMUNIKASI:
- ${styleMap[adminCommStyle] || styleMap['santai-profesional']}
- ${emojiMap[adminEmojiUsage] || emojiMap['minimal']}
- Kata ganti: ${formalityMap[adminFormality] || formalityMap['informal']}
- Respons singkat dan langsung ke poin

${adminCustomInstructions ? `📌 INSTRUKSI KHUSUS:\n${adminCustomInstructions}\n` : ''}
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
Ketika pengelola menyebut tanggal relatif, kamu HARUS mengkonversinya ke format YYYY-MM-DD:
- "hari ini" / "malam ini" / "sekarang" → check-in: ${today}
- "besok" / "bsk" / "besuk" → check-in: ${tomorrow}
- "lusa" → check-in: ${lusa}
- "minggu depan" / "pekan depan" → check-in: ${nextWeek}
- "weekend" / "akhir pekan" / "sabtu" → check-in: ${weekend}

Default check-out adalah 1 malam setelah check-in jika tidak disebutkan.

Kamu bisa:
1. Cek ketersediaan kamar untuk tanggal tertentu (gunakan get_availability_summary)
2. Memberikan statistik booking (gunakan get_booking_stats dengan period: today/week/month/all)
3. Menampilkan N booking terakhir (gunakan get_recent_bookings dengan limit sesuai permintaan)
4. Mencari booking berdasarkan nama tamu atau kode booking (gunakan search_bookings)
5. Melihat daftar kamar dan inventori (gunakan get_room_inventory)
6. Membuat booking baru langsung (gunakan create_admin_booking)
7. **Mengubah harga kamar** (gunakan update_room_price)
8. **Melihat daftar harga kamar** (gunakan get_room_prices)
9. **Lihat detail booking** (gunakan get_booking_detail)
10. **Batalkan/Konfirmasi booking** (gunakan update_booking_status)
11. **Edit info tamu** (gunakan update_guest_info)
12. **Reschedule booking** (gunakan reschedule_booking)
13. **Ganti/Pindah kamar** (gunakan change_booking_room)

💰 PANDUAN UPDATE HARGA:
- "ubah harga Deluxe jadi 350000" → update_room_price dengan room_name: "Deluxe", price_type: "main", new_price: 350000
- "set harga weekend Villa 500000" → update_room_price dengan room_name: "Villa", price_type: "weekend", new_price: 500000
- "harga weekday Superior 275000" → update_room_price dengan room_name: "Superior", price_type: "weekday", new_price: 275000
- "buat promo kamar Deluxe 299000 sampai akhir bulan" → update_room_price dengan room_name: "Deluxe", price_type: "promo", new_price: 299000, promo_end_date: tanggal akhir bulan
- "lihat harga kamar" / "daftar harga" → gunakan get_room_prices
- "harga Deluxe berapa?" → gunakan get_room_prices dengan room_name: "Deluxe"

📝 PANDUAN UPDATE BOOKING:
- "detail booking BK-1234" / "info booking BK-1234" → get_booking_detail
- "batalkan booking BK-1234" / "cancel BK-1234" → update_booking_status dengan new_status: "cancelled"
- "konfirmasi booking BK-1234" → update_booking_status dengan new_status: "confirmed"
- "ubah nama tamu di BK-1234 jadi Ahmad" → update_guest_info dengan guest_name
- "ganti HP booking BK-1234 ke 081234567890" → update_guest_info dengan guest_phone
- "reschedule BK-1234 ke 25-30 Jan" → reschedule_booking dengan new_check_in dan new_check_out
- "pindah BK-1234 ke Deluxe A2" / "upgrade kamar" → change_booking_room dengan new_room_name dan new_room_number

📌 PENTING - PILIHAN TOOL YANG BENAR:
- "Tampilkan 5 booking terakhir" / "booking terbaru" / "lihat 10 booking terakhir" → gunakan get_recent_bookings
- "Cari booking atas nama Budi" / "booking dari Ahmad" / "cari kode ABC123" → gunakan search_bookings
- "ubah harga" / "update harga" / "set harga" → gunakan update_room_price
- "lihat harga" / "daftar harga" / "harga kamar" → gunakan get_room_prices
- "detail booking" / "info booking" → gunakan get_booking_detail
- "batalkan" / "cancel" / "konfirmasi booking" → gunakan update_booking_status
- "ubah nama" / "ganti HP" / "edit email tamu" → gunakan update_guest_info
- "reschedule" / "ubah tanggal" / "pindah jadwal" → gunakan reschedule_booking
- "ganti kamar" / "pindah kamar" / "upgrade" → gunakan change_booking_room
- JANGAN gunakan search_bookings untuk menampilkan booking terakhir tanpa kata kunci pencarian!

Gunakan bahasa Indonesia yang singkat dan jelas.
Format angka dengan Rp dan titik sebagai pemisah ribuan (contoh: Rp 350.000).
Untuk tanggal, gunakan format DD MMM YYYY (contoh: 8 Jan 2026).

Jika pengelola minta buat booking tapi info belum lengkap, tanyakan yang kurang.
Sebelum buat booking, selalu cek ketersediaan dulu dan konfirmasi detailnya.
Setelah update harga, konfirmasi perubahan dengan menampilkan harga lama dan baru.
Setelah update booking, konfirmasi perubahan dengan menampilkan data lama vs baru.`;

    // Prepare messages for AI
    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({ role: m.role, content: m.content }))
    ];

    // Audit log data
    const startTime = Date.now();
    const sessionId = crypto.randomUUID();
    const executedTools: any[] = [];
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop();
    const userMessage = lastUserMessage?.content || '';
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Helper function to log audit entry
    async function logAuditEntry(aiResponse: string) {
      try {
        await supabase
          .from('admin_chatbot_audit_logs')
          .insert({
            admin_id: adminId!,
            admin_email: adminEmail,
            session_id: sessionId,
            user_message: userMessage,
            tool_calls: executedTools,
            ai_response: aiResponse,
            duration_ms: Date.now() - startTime,
            ip_address: ipAddress,
            user_agent: userAgent,
          });
        console.log(`Audit log saved: admin=${adminEmail}, message="${userMessage.substring(0, 50)}..."`);
      } catch (error) {
        console.error('Failed to log audit entry:', error);
        // Don't throw - audit logging failure shouldn't break the chatbot
      }
    }

    // Stream response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let finalResponse = '';
        try {
          let currentMessages = aiMessages;
          let iterations = 0;
          const maxIterations = 5;

          while (iterations < maxIterations) {
            iterations++;
            
            const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
            if (!LOVABLE_API_KEY) {
              throw new Error("LOVABLE_API_KEY is not configured");
            }

            const response = await fetch(`${LOVABLE_API_URL}/chat/completions`, {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${LOVABLE_API_KEY}`
              },
              body: JSON.stringify({
                messages: currentMessages,
                model: "google/gemini-3-flash-preview",
                tools: tools,
                tool_choice: "auto"
              })
            });

            if (!response.ok) {
              const error = await response.text();
              console.error("AI API error:", error);
              throw new Error(`AI API error: ${response.status}`);
            }

            const result = await response.json();
            const choice = result.choices?.[0];

            if (!choice) {
              throw new Error("No response from AI");
            }

            // Check for tool calls
            if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
              // Add assistant message with tool calls
              currentMessages.push(choice.message);

              // Execute each tool call
              for (const toolCall of choice.message.tool_calls) {
                const toolName = toolCall.function.name;
                const toolArgs = JSON.parse(toolCall.function.arguments || "{}");

                try {
                  const toolResult = await executeTool(supabase, toolName, toolArgs);
                  
                  // Track tool execution for audit
                  executedTools.push({
                    tool_name: toolName,
                    arguments: toolArgs,
                    result: toolResult,
                    success: true,
                    executed_at: new Date().toISOString()
                  });

                  currentMessages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(toolResult)
                  });
                } catch (toolError: any) {
                  console.error(`Tool error (${toolName}):`, toolError);
                  
                  // Track failed tool execution for audit
                  executedTools.push({
                    tool_name: toolName,
                    arguments: toolArgs,
                    error: toolError.message,
                    success: false,
                    executed_at: new Date().toISOString()
                  });

                  currentMessages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: JSON.stringify({ error: toolError.message })
                  });
                }
              }
              // Continue loop to get final response
              continue;
            }

            // No tool calls, stream the final response
            const content = choice.message?.content || "";
            if (content) {
              finalResponse = content;
              controller.enqueue(encoder.encode(content));
            }
            break;
          }

          // Log audit entry after successful completion
          await logAuditEntry(finalResponse);

          controller.close();
        } catch (error: any) {
          console.error("Stream error:", error);
          const errorMsg = `Error: ${error.message}`;
          controller.enqueue(encoder.encode(errorMsg));
          
          // Log audit entry even on error
          await logAuditEntry(`ERROR: ${error.message}`);
          
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });

  } catch (error: any) {
    console.error("Admin chatbot error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
