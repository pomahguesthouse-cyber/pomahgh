// ============= ROOM MANAGEMENT TOOLS =============

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { findBestRoomMatch } from "../lib/roomMatcher.ts";

interface RoomInventoryRow {
  id: string;
  name: string;
  room_count: number;
  room_numbers: string[] | null;
  available: boolean;
  price_per_night: number;
  max_guests: number;
}

interface RoomPriceRow {
  id: string;
  name: string;
  price_per_night: number;
  monday_price: number | null;
  tuesday_price: number | null;
  wednesday_price: number | null;
  thursday_price: number | null;
  friday_price: number | null;
  saturday_price: number | null;
  sunday_price: number | null;
  promo_price: number | null;
  promo_start_date: string | null;
  promo_end_date: string | null;
}

export async function getRoomInventory(supabase: SupabaseClient) {
  const { data: rooms, error } = await supabase
    .from('rooms')
    .select('id, name, room_count, room_numbers, available, price_per_night, max_guests')
    .order('name');

  if (error) throw error;

  const rows = (rooms || []) as RoomInventoryRow[];
  return {
    total_room_types: rows.length,
    rooms: rows.map((r) => ({
      id: r.id,
      name: r.name,
      status: r.available ? 'Tersedia' : 'Tidak Tersedia',
      total_units: r.room_count,
      room_numbers: r.room_numbers || [],
      price_per_night: r.price_per_night,
      max_guests: r.max_guests
    }))
  };
}

export async function updateRoomPrice(supabase: SupabaseClient, args: Record<string, unknown>) {
  const { room_name, price_type, new_price, promo_start_date, promo_end_date } = args as {
    room_name: string;
    price_type: string;
    new_price: number;
    promo_start_date?: string;
    promo_end_date?: string;
  };

  const { data: allRooms, error: findError } = await supabase
    .from('rooms')
    .select('id, name, price_per_night, monday_price, tuesday_price, wednesday_price, thursday_price, friday_price, saturday_price, sunday_price, promo_price, promo_start_date, promo_end_date');

  if (findError) throw findError;

  const room = findBestRoomMatch(room_name, allRooms || []);

  if (!room) {
    const roomList = (allRooms || []).map((r: RoomPriceRow) => r.name).join(', ') || 'tidak ada';
    throw new Error(`Kamar "${room_name}" tidak ditemukan. Kamar yang tersedia: ${roomList}`);
  }

  const typedRoom = room as RoomPriceRow;
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
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
    .eq('id', typedRoom.id);

  if (updateError) throw updateError;

  // Get the old price for comparison
  let oldPrice: number | null = null;
  switch (price_type) {
    case 'main': oldPrice = typedRoom.price_per_night; break;
    case 'monday': oldPrice = typedRoom.monday_price; break;
    case 'tuesday': oldPrice = typedRoom.tuesday_price; break;
    case 'wednesday': oldPrice = typedRoom.wednesday_price; break;
    case 'thursday': oldPrice = typedRoom.thursday_price; break;
    case 'friday': oldPrice = typedRoom.friday_price; break;
    case 'saturday': oldPrice = typedRoom.saturday_price; break;
    case 'sunday': oldPrice = typedRoom.sunday_price; break;
    case 'weekday': oldPrice = typedRoom.monday_price; break;
    case 'weekend': oldPrice = typedRoom.saturday_price; break;
    case 'promo': oldPrice = typedRoom.promo_price; break;
  }

  const result: Record<string, unknown> = {
    success: true,
    room_name: typedRoom.name,
    price_type: priceFields.join(', '),
    old_price: oldPrice,
    new_price: new_price
  };

  if (price_type === 'promo' && (promo_start_date || promo_end_date)) {
    result.promo_start_date = promo_start_date || typedRoom.promo_start_date;
    result.promo_end_date = promo_end_date || typedRoom.promo_end_date;
  }

  return result;
}

export async function getRoomPrices(supabase: SupabaseClient, roomName?: string) {
  const { data: allRooms, error } = await supabase
    .from('rooms')
    .select('id, name, price_per_night, monday_price, tuesday_price, wednesday_price, thursday_price, friday_price, saturday_price, sunday_price, promo_price, promo_start_date, promo_end_date')
    .order('name');

  if (error) throw error;

  if (!allRooms || allRooms.length === 0) {
    throw new Error('Tidak ada kamar yang ditemukan');
  }

  let rooms = allRooms as RoomPriceRow[];

  if (roomName) {
    const matchedRoom = findBestRoomMatch(roomName, allRooms);
    if (!matchedRoom) {
      const roomList = rooms.map((r) => r.name).join(', ');
      throw new Error(`Kamar "${roomName}" tidak ditemukan. Kamar yang tersedia: ${roomList}`);
    }
    rooms = [matchedRoom as RoomPriceRow];
  }

  return {
    count: rooms.length,
    rooms: rooms.map((r) => {
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
