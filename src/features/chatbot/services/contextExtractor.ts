import type { ConversationContext } from "../types";

export const DEFAULT_CONTEXT: ConversationContext = {
  guest_name: null,
  preferred_room: null,
  check_in_date: null,
  check_out_date: null,
  guest_count: null,
  phone_number: null,
  email: null,
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

  const nameMatch = content.match(/(?:atas nama|nama tamu|nama:?)\s*([A-Za-z\s]+?)(?:\.|,|untuk|\n)/i);
  if (nameMatch) updated.guest_name = nameMatch[1].trim();

  return updated;
}
