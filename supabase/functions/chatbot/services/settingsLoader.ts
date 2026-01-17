import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { ChatbotSettings } from '../lib/types.ts';
import { DEFAULT_CHATBOT_SETTINGS } from '../lib/types.ts';

/**
 * Load chatbot settings from database or use provided/default settings
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

  // Fetch from database
  console.log("Fetching chatbot settings from database...");
  const { data: dbSettings, error } = await supabase
    .from("chatbot_settings")
    .select("*")
    .single();

  if (error) {
    console.log("Error fetching chatbot settings:", error.message);
    return DEFAULT_CHATBOT_SETTINGS;
  }

  return {
    ...DEFAULT_CHATBOT_SETTINGS,
    ...dbSettings
  } as ChatbotSettings;
}
