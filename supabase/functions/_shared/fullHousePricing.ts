import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Helper untuk pertanyaan "sewa seluruh guesthouse / 1 rumah / full house".
 *
 * Tujuan: kalau tamu menanyakan harga booking 1 guesthouse / rumah penuh,
 * chatbot harus menjawab tarif flat (default Rp 3.000.000/malam) tanpa harus
 * memilih tipe kamar dulu. Harga + status aktif diambil dari hotel_settings
 * supaya admin bisa edit.
 */

const FULL_HOUSE_RE =
  /\b(sewa|booking|pesan|rental|borong|private|privat)\s*(satu|1|seluruh|semua|full|seluruh\s*nya)?\s*(rumah|guest\s*house|guesthouse|villa|gues?house)\b|\b(seluruh|semua)\s*(kamar|guesthouse|rumah)\b|\bfull\s*house\b|\b(rumah|guesthouse)\s*(full|penuh|booked\s*all|semuanya)\b|\b(sewa|booking)\s*(satu|1)\s*(unit|properti)\b/i;

// Hindari false-positive untuk frasa seperti "kamar deluxe full bed",
// "extra bed full", "kasur full". Kalau terdeteksi konteks kamar single,
// kita batalkan match.
const NEGATIVE_RE = /\b(deluxe|grand\s*deluxe|family\s*suite|standard|superior|single|kasur|bed)\b/i;

export function isFullHouseQuestion(message: string): boolean {
  if (!message) return false;
  if (!FULL_HOUSE_RE.test(message)) return false;
  // Kalau ada nama tipe kamar / kasur, ini bukan pertanyaan full house.
  if (NEGATIVE_RE.test(message) && !/full\s*house|seluruh\s*guesthouse|sewa\s*(satu|1)\s*(rumah|guesthouse|villa)/i.test(message)) {
    return false;
  }
  return true;
}

export interface FullHouseInfo {
  enabled: boolean;
  price: number;
  description: string;
  totalRooms: number;
  totalCapacity: number;
}

export async function getFullHouseInfo(supabase: SupabaseClient): Promise<FullHouseInfo> {
  const [{ data: settings }, { data: rooms }] = await Promise.all([
    supabase
      .from('hotel_settings')
      .select('full_house_price, full_house_enabled, full_house_description')
      .limit(1)
      .maybeSingle(),
    supabase
      .from('rooms')
      .select('max_guests, allotment')
      .eq('available', true),
  ]);

  const price = Number((settings as { full_house_price?: number } | null)?.full_house_price ?? 3000000) || 3000000;
  const enabled = (settings as { full_house_enabled?: boolean } | null)?.full_house_enabled !== false;
  const description =
    (settings as { full_house_description?: string } | null)?.full_house_description ||
    'Sewa seluruh guesthouse (semua kamar aktif) — cocok untuk acara keluarga, gathering, atau rombongan.';

  const roomList = (rooms || []) as Array<{ max_guests: number | null; allotment: number | null }>;
  const totalRooms = roomList.reduce((sum, r) => sum + (Number(r.allotment) || 1), 0);
  const totalCapacity = roomList.reduce(
    (sum, r) => sum + (Number(r.max_guests) || 0) * (Number(r.allotment) || 1),
    0,
  );

  return { enabled, price, description, totalRooms, totalCapacity };
}

function rupiah(n: number): string {
  return 'Rp' + Math.round(n).toLocaleString('id-ID');
}

export function formatFullHouseReply(info: FullHouseInfo): string {
  if (!info.enabled) {
    return 'Mohon maaf kak, untuk sewa seluruh guesthouse saat ini sedang tidak tersedia. Saya bantu cek opsi per kamar saja ya 🙏';
  }
  const capacityLine =
    info.totalRooms > 0
      ? `Sudah termasuk semua kamar aktif (${info.totalRooms} unit${info.totalCapacity > 0 ? `, kapasitas total ${info.totalCapacity} tamu` : ''}).`
      : 'Sudah termasuk seluruh kamar aktif di guesthouse.';
  return (
    `Untuk sewa seluruh guesthouse (full house) tarifnya *${rupiah(info.price)}/malam* ya kak 🏡\n` +
    `${capacityLine}\n` +
    `Mau saya bantu cek ketersediaan untuk tanggal tertentu?`
  );
}