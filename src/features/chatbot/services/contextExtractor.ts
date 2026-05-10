import type { ConversationContext } from "../types";

export const DEFAULT_CONTEXT: ConversationContext = {
  guest_name: null,
  preferred_room: null,
  check_in_date: null,
  check_out_date: null,
  guest_count: null,
  phone_number: null,
  email: null,
  last_booking_code: null,
  last_booking_guest_email: null,
  last_booking_guest_phone: null,
};

export function extractConversationContext(
  content: string,
  currentContext: ConversationContext,
): ConversationContext {
  const updated = { ...currentContext };

  const roomMatch = content.match(/(?:kamar|room|tipe)\s*(Single|Deluxe|Grand Deluxe|Family Suite|Villa)/i);
  if (roomMatch) updated.preferred_room = roomMatch[1];

  const dateMatch = content.match(/(\d{1,2})\s*(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s*(\d{4})?/gi);
  if (dateMatch && dateMatch.length >= 1) {
    if (!updated.check_in_date) updated.check_in_date = dateMatch[0];
    if (dateMatch.length >= 2 && !updated.check_out_date) updated.check_out_date = dateMatch[1];
  }

  const guestMatch = content.match(/(\d+)\s*(?:orang|tamu|guest)/i);
  if (guestMatch) updated.guest_count = parseInt(guestMatch[1], 10);

  const extractedName = extractGuestName(content);
  if (extractedName) updated.guest_name = extractedName;

  // Ekstrak kode booking PMH-XXXXXX dari konfirmasi asisten
  const bookingCodeMatch = content.match(/\b(PMH-[A-Z0-9]{6})\b/);
  if (bookingCodeMatch) updated.last_booking_code = bookingCodeMatch[1];

  return updated;
}

// Stopword Indonesia + English yang sering ke-tangkap salah sebagai nama
const NAME_STOPWORDS = new Set([
  "untuk", "kami", "saya", "aku", "kita", "kamu", "anda", "mereka",
  "dia", "ini", "itu", "tamu", "guest", "orang", "booking", "pesan",
  "reservasi", "kamar", "room", "the", "a", "an", "atas", "nama",
  "dan", "atau", "yang", "dengan", "dari", "ke", "di", "pada",
  "sebagai", "tolong", "mohon", "ya", "iya", "ok", "oke", "siap",
]);

function isLikelyName(candidate: string): boolean {
  const words = candidate.trim().split(/\s+/);
  // Wajib min 2 kata supaya tidak salah tangkap "untuk" / "kami"
  if (words.length < 2 || words.length > 5) return false;
  for (const w of words) {
    if (w.length < 2 || w.length > 30) return false;
    if (!/^[A-Za-z][A-Za-z'-]*$/.test(w)) return false;
    if (NAME_STOPWORDS.has(w.toLowerCase())) return false;
  }
  return true;
}

function extractGuestName(content: string): string | null {
  // Tangkap kandidat sampai delimiter umum, lalu validasi.
  const match = content.match(
    /(?:atas nama|nama tamu|nama pemesan|nama:?)\s+([A-Za-z][A-Za-z\s'-]{2,60}?)(?=\s*(?:[.,;:!?\n]|untuk|buat|tgl|tanggal|tlp|telp|no\.?|hp|wa|email|$))/i,
  );
  if (!match) return null;
  const candidate = match[1].trim().replace(/\s+/g, " ");
  return isLikelyName(candidate) ? candidate : null;
}
