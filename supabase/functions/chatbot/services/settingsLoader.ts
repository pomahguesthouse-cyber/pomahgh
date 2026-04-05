import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { ChatbotSettings } from '../lib/types.ts';
import { DEFAULT_CHATBOT_SETTINGS } from '../lib/types.ts';
import { cache, CACHE_TTL } from '../lib/cache.ts';

const SETTINGS_CACHE_KEY = 'chatbot_settings';

/**
 * Load chatbot settings from database or use provided/default settings
 * Uses in-memory cache to avoid repeated DB queries
 */
export async function loadChatbotSettings(
  supabase: SupabaseClient,
  providedSettings?: Partial<ChatbotSettings>
): Promise<ChatbotSettings> {
  // If valid settings provided, use them
  if (providedSettings?.persona_name) {
    return {
      ...DEFAULT_CHATBOT_SETTINGS,
      ...providedSettings
    } as ChatbotSettings;
  }

  // Check cache first
  const cached = cache.get<ChatbotSettings>(SETTINGS_CACHE_KEY);
  if (cached) {
    return cached;
  }

  // Fetch from database
  const { data: dbSettings, error } = await supabase
    .from("chatbot_settings")
    .select("*")
    .single();

  if (error) {
    console.log("Error fetching chatbot settings:", error.message);
    return DEFAULT_CHATBOT_SETTINGS;
  }

  const settings = {
    ...DEFAULT_CHATBOT_SETTINGS,
    ...dbSettings
  } as ChatbotSettings;

  cache.set(SETTINGS_CACHE_KEY, settings, CACHE_TTL.CHATBOT_SETTINGS);
  return settings;
}
