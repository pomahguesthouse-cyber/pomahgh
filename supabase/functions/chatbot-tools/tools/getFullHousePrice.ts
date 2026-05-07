import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getFullHouseInfo } from '../../_shared/fullHousePricing.ts';

/**
 * Return tariff info for renting the whole guesthouse / 1 rumah full.
 */
export async function handleGetFullHousePrice(supabase: SupabaseClient) {
  const info = await getFullHouseInfo(supabase);
  if (!info.enabled) {
    return {
      enabled: false,
      message: 'Sewa seluruh guesthouse saat ini tidak tersedia. Tawarkan opsi per kamar saja.',
    };
  }
  return {
    enabled: true,
    price_per_night: info.price,
    price_formatted: `Rp ${info.price.toLocaleString('id-ID')}`,
    total_rooms: info.totalRooms,
    total_capacity: info.totalCapacity,
    description: info.description,
    note:
      'Tarif flat per malam untuk seluruh guesthouse (semua kamar aktif). Pakai untuk pertanyaan "sewa 1 rumah / full house / borong semua kamar".',
  };
}