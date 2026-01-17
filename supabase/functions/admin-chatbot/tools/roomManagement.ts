// ============= ROOM MANAGEMENT TOOLS =============

import { findBestRoomMatch } from "../lib/roomMatcher.ts";

export async function getRoomInventory(supabase: any) {
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

export async function updateRoomPrice(supabase: any, args: any) {
  const { room_name, price_type, new_price, promo_start_date, promo_end_date } = args;

  const { data: allRooms, error: findError } = await supabase
    .from('rooms')
    .select('id, name, price_per_night, monday_price, tuesday_price, wednesday_price, thursday_price, friday_price, saturday_price, sunday_price, promo_price, promo_start_date, promo_end_date');

  if (findError) throw findError;

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

export async function getRoomPrices(supabase: any, roomName?: string) {
  const { data: allRooms, error } = await supabase
    .from('rooms')
    .select('id, name, price_per_night, monday_price, tuesday_price, wednesday_price, thursday_price, friday_price, saturday_price, sunday_price, promo_price, promo_start_date, promo_end_date')
    .order('name');

  if (error) throw error;

  if (!allRooms || allRooms.length === 0) {
    throw new Error('Tidak ada kamar yang ditemukan');
  }

  let rooms = allRooms;

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
