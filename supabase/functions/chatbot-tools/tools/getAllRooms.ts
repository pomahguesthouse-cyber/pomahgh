import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Get all available room types with prices and capacity info
 */
export async function handleGetAllRooms(supabase: SupabaseClient) {
  // Get all rooms
  const { data: rooms, error: roomsError } = await supabase
    .from("rooms")
    .select("id, name, description, price_per_night, max_guests, size_sqm, features, allotment")
    .eq("available", true)
    .order("price_per_night");

  if (roomsError) throw roomsError;

  // Fetch extra bed add-ons for capacity info
  const { data: extraBedAddons } = await supabase
    .from("room_addons")
    .select("room_id, extra_capacity, max_quantity")
    .eq("is_active", true)
    .ilike("name", "%extra bed%");

  const roomList = (rooms || []).map(room => {
    // Find extra bed addon (room-specific or global with null room_id)
    const extraBed = (extraBedAddons || []).find(a => 
      a.room_id === room.id || a.room_id === null
    );
    
    const maxExtraBeds = extraBed?.max_quantity || 0;
    const extraCapacity = extraBed ? (extraBed.extra_capacity || 1) * maxExtraBeds : 0;
    
    return {
      name: room.name,
      price_per_night: room.price_per_night,
      price_formatted: `Rp ${room.price_per_night.toLocaleString('id-ID')}`,
      max_guests: room.max_guests,
      max_extra_beds: maxExtraBeds,
      max_guests_with_extra_bed: room.max_guests + extraCapacity,
      size_sqm: room.size_sqm,
      total_units: room.allotment,
      description: room.description,
      features: room.features || []
    };
  });

  return {
    message: "Daftar tipe kamar yang tersedia:",
    rooms: roomList,
    note: "Kapasitas bisa ditambah dengan extra bed (biaya tambahan). Untuk cek ketersediaan tanggal tertentu, silakan sebutkan tanggal check-in dan check-out."
  };
}
