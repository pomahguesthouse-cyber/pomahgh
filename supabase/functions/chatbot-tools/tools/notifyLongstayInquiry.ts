import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface LongstayParams {
  guest_name?: string;
  guest_phone?: string;
  room_name?: string;
  check_in?: string;
  check_out?: string;
  num_nights?: number;
  message_summary?: string;
}

export async function handleNotifyLongstayInquiry(
  _supabase: SupabaseClient,
  _params: LongstayParams
) {
  return {
    success: false,
    error: "WhatsApp notification not available",
  };
}
