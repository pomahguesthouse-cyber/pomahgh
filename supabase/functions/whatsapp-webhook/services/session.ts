import type { SupabaseClient, HotelSettingsData } from '../types.ts';

// Module-level TTL cache for hotel_settings
let hotelSettingsCache: { data: HotelSettingsData | null; expiresAt: number } = { data: null, expiresAt: 0 };
const HOTEL_SETTINGS_TTL = 5 * 60 * 1000;

export async function getCachedHotelSettings(supabase: SupabaseClient): Promise<HotelSettingsData | null> {
  const now = Date.now();
  if (hotelSettingsCache.data && now < hotelSettingsCache.expiresAt) {
    return hotelSettingsCache.data;
  }
  const { data } = await supabase
    .from('hotel_settings')
    .select('whatsapp_session_timeout_minutes, whatsapp_ai_whitelist, whatsapp_response_mode, whatsapp_manager_numbers')
    .single();
  hotelSettingsCache = { data, expiresAt: now + HOTEL_SETTINGS_TTL };
  return data;
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
  await supabase
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
}
