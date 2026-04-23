import type { SupabaseClient, HotelSettingsData } from '../types.ts';

// Module-level TTL cache for hotel_settings.
// Short TTL agar perubahan role manager (whatsapp_manager_numbers) cepat berlaku.
let hotelSettingsCache: { data: HotelSettingsData | null; expiresAt: number } = { data: null, expiresAt: 0 };
const HOTEL_SETTINGS_TTL = 30 * 1000; // 30 detik

export async function getCachedHotelSettings(supabase: SupabaseClient): Promise<HotelSettingsData | null> {
  const now = Date.now();
  if (hotelSettingsCache.data && now < hotelSettingsCache.expiresAt) {
    return hotelSettingsCache.data;
  }
  const { data, error } = await supabase
    .from('hotel_settings')
    .select('whatsapp_session_timeout_minutes, whatsapp_ai_whitelist, whatsapp_response_mode, whatsapp_manager_numbers, whatsapp_memory_retention_days, whatsapp_history_window_messages')
    .single();
  if (error || !data) {
    console.warn('[session] getCachedHotelSettings failed:', error?.message);
    // Don't cache failures — allow retry on next call
    return hotelSettingsCache.data || null; // Return stale data if available
  }
  hotelSettingsCache = { data, expiresAt: now + HOTEL_SETTINGS_TTL };
  return data;
}

export function invalidateHotelSettingsCache(): void {
  hotelSettingsCache = { data: null, expiresAt: 0 };
}

export async function ensureConversation(
  supabase: SupabaseClient,
  session: { conversation_id?: string } | null,
  phone: string,
): Promise<string> {
  if (session?.conversation_id) return session.conversation_id;

  const { data: newConv, error } = await supabase
    .from('chat_conversations')
    .insert({ session_id: `wa_${phone}_${Date.now()}`, message_count: 0 })
    .select()
    .single();

  if (error || !newConv?.id) {
    console.error('❌ ensureConversation failed:', error?.message);
    throw new Error('Failed to create conversation');
  }

  return newConv.id;
}

export async function updateSession(
  supabase: SupabaseClient,
  phone: string,
  conversationId: string,
  isTakeover: boolean,
  sessionType: 'guest' | 'admin' = 'guest',
) {
  const { error } = await supabase
    .from('whatsapp_sessions')
    .upsert({
      phone_number: phone,
      conversation_id: conversationId,
      last_message_at: new Date().toISOString(),
      is_active: true,
      is_takeover: isTakeover,
      takeover_at: isTakeover ? new Date().toISOString() : null,
      session_type: sessionType,
    }, { onConflict: 'phone_number' });

  if (error) {
    console.warn(`[session] updateSession failed for ${phone}:`, error.message);
  }
}

/**
 * Cek apakah tamu (berdasarkan nomor telepon) memiliki booking yang masih aktif
 * atau baru saja check-out dalam rentang H+`retentionDays` hari terakhir.
 * Digunakan untuk menentukan apakah memory percakapan dipertahankan walau idle.
 */
export async function hasRecentOrActiveBooking(
  supabase: SupabaseClient,
  phone: string,
  retentionDays: number = 2,
): Promise<boolean> {
  try {
    const days = Math.max(0, Math.min(retentionDays, 30));
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    // Normalisasi: cek baik prefix '62' maupun '0'
    const variants = new Set<string>([phone]);
    if (phone.startsWith('62')) variants.add('0' + phone.slice(2));
    if (phone.startsWith('0')) variants.add('62' + phone.slice(1));

    const { data, error } = await supabase
      .from('bookings')
      .select('id')
      .in('guest_phone', Array.from(variants))
      .not('status', 'in', '("cancelled","rejected","no_show")')
      .gte('check_out', cutoff)
      .limit(1);

    if (error) {
      console.warn(`[session] hasRecentOrActiveBooking error: ${error.message}`);
      return false;
    }
    return (data?.length ?? 0) > 0;
  } catch (err) {
    console.warn(`[session] hasRecentOrActiveBooking exception:`, err);
    return false;
  }
}
