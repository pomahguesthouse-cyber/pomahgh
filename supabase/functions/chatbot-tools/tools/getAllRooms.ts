import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Get all available room types with prices and capacity info
 */
export async function handleGetAllRooms(supabase: SupabaseClient) {
  // Get all rooms
  const { data: rooms, error: roomsError } = await supabase
    .from("rooms")
    .select("id, name, description, price_per_night, max_guests, size_sqm, features, allotment, pricing_priority")
    .eq("available", true)
    .order("price_per_night");

  if (roomsError) throw roomsError;

  const today = new Date().toISOString().split('T')[0];

  // Fetch active promotions
  const { data: activePromos } = await supabase
    .from("room_promotions")
    .select("room_id, name, discount_percentage, promo_price, start_date, end_date, badge_text")
    .eq("is_active", true)
    .lte("start_date", today)
    .gte("end_date", today);

  const promoMap = new Map<string, any>();
  (activePromos || []).forEach((p: any) => {
    promoMap.set(p.room_id, p);
  });

  // Fetch ALL active add-ons (not just extra bed) for capacity + pricing info
  const { data: allAddons } = await supabase
    .from("room_addons")
    .select("room_id, name, price, extra_capacity, max_quantity")
    .eq("is_active", true);

  const extraBedAddons = (allAddons || []).filter(a =>
    (a.name || "").toLowerCase().includes("extra bed")
  );

  const roomList = (rooms || []).map(room => {
    // Find extra bed addon (room-specific or global with null room_id)
    const extraBed = (extraBedAddons || []).find(a => 
      a.room_id === room.id || a.room_id === null
    );
    
    const maxExtraBeds = extraBed?.max_quantity || 0;
    const extraCapacity = extraBed ? (extraBed.extra_capacity || 1) * maxExtraBeds : 0;

    // Calculate effective price based on pricing priority
    const priority = room.pricing_priority || ['base', 'promo', 'dynamic'];
    const promo = promoMap.get(room.id);
    let effectivePrice = room.price_per_night;
    let priceSource = 'base';

    for (const source of priority) {
      if (source === 'promo' && promo) {
        effectivePrice = promo.promo_price 
          ? promo.promo_price 
          : Math.round(room.price_per_night * (1 - (promo.discount_percentage || 0) / 100));
        priceSource = 'promo';
        break;
      }
      if (source === 'base') {
        effectivePrice = room.price_per_night;
        priceSource = 'base';
        break;
      }
    }

    // Build add-ons list for this room (room-specific or global with null room_id)
    const roomAddons = (allAddons || [])
      .filter(a => a.room_id === room.id || a.room_id === null)
      .map(a => ({
        name: a.name,
        price: Number(a.price) || 0,
        price_formatted: `Rp ${(Number(a.price) || 0).toLocaleString('id-ID')}`,
        max_quantity: a.max_quantity || 1,
      }));

    return {
      name: room.name,
      price_per_night: effectivePrice,
      price_formatted: `Rp ${effectivePrice.toLocaleString('id-ID')}`,
      base_price: room.price_per_night,
      price_source: priceSource,
      promo: promo ? { name: promo.name, badge: promo.badge_text } : null,
      max_guests: room.max_guests,
      max_extra_beds: maxExtraBeds,
      max_guests_with_extra_bed: room.max_guests + extraCapacity,
      size_sqm: room.size_sqm,
      total_units: room.allotment,
      description: room.description,
      features: room.features || [],
      add_ons: roomAddons,
    };
  });

  return {
    message: "Daftar tipe kamar yang tersedia:",
    rooms: roomList,
    note: "Harga yang ditampilkan adalah harga efektif berdasarkan prioritas harga kamar. Untuk cek ketersediaan tanggal tertentu, silakan sebutkan tanggal check-in dan check-out."
  };
}
