import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type { SupabaseClient };

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export interface ManagerInfo {
  phone: string;
  name: string;
  role?: string;
  id?: string;
}

export interface HotelSettingsData {
  whatsapp_session_timeout_minutes: number | null;
  whatsapp_ai_whitelist: string[] | null;
  whatsapp_response_mode: string | null;
  whatsapp_manager_numbers: ManagerInfo[] | null;
}

export interface WhatsAppSession {
  phone_number: string;
  conversation_id?: string;
  last_message_at?: string;
  is_active?: boolean;
  is_blocked?: boolean;
  is_takeover?: boolean;
  takeover_at?: string | null;
  session_type?: 'guest' | 'admin';
  awaiting_name?: boolean;
  guest_name?: string | null;
  pending_messages?: string[];
  pending_since?: string | null;
}

export interface ToolCall {
  id: string;
  function: { name: string; arguments: string };
}

export interface AgentResult {
  response: Response | null;
  handled: boolean;
}

export interface EnvConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  chatbotToolsInternalSecret: string;
  fonnteApiKey: string;
}

export function getEnvConfig(): EnvConfig {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const chatbotToolsInternalSecret = Deno.env.get("CHATBOT_TOOLS_INTERNAL_SECRET")!;
  const fonnteApiKey = Deno.env.get("FONNTE_API_KEY")!;

  if (!fonnteApiKey) throw new Error("FONNTE_API_KEY not configured");
  if (!chatbotToolsInternalSecret) throw new Error("CHATBOT_TOOLS_INTERNAL_SECRET not configured");

  return { supabaseUrl, supabaseServiceKey, chatbotToolsInternalSecret, fonnteApiKey };
}
