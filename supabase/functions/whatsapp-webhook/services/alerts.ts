import type { SupabaseClient } from "../types.ts";

export type AlertType =
  | "no_date_found"
  | "low_confidence"
  | "multi_room_escalation"
  | "booking_update_escalation"
  | "refund_cancel_intent"
  | "other";

interface LogAlertParams {
  alert_type: AlertType;
  phone_number: string;
  conversation_id?: string | null;
  last_user_message?: string | null;
  confidence?: number | null;
  intent?: string | null;
  recentMessages?: Array<{ role: string; content: string }>;
  booking_code?: string | null;
  reason?: string | null;
}

/**
 * Insert a row into `chatbot_alerts` so admin gets notified (via realtime)
 * about situations needing follow-up: no date detected in booking flow,
 * low intent classification confidence, etc.
 *
 * Fire-and-forget — failures are logged but never throw.
 */
export async function logChatbotAlert(
  supabase: SupabaseClient,
  params: LogAlertParams,
): Promise<void> {
  try {
    const { recentMessages = [], booking_code, reason, ...rest } = params;
    const baseSnippet = recentMessages
      .slice(-6)
      .map((m) => `${m.role === "assistant" ? "Bot" : "Tamu"}: ${String(m.content ?? "").slice(0, 220)}`)
      .join("\n");
    const header = [
      booking_code ? `🔖 Booking: ${booking_code}` : null,
      reason ? `📌 Alasan: ${reason}` : null,
    ].filter(Boolean).join("\n");
    const snippet = [header, baseSnippet].filter(Boolean).join("\n\n");

    const { error } = await supabase.from("chatbot_alerts").insert({
      alert_type: rest.alert_type,
      phone_number: rest.phone_number,
      conversation_id: rest.conversation_id ?? null,
      last_user_message: rest.last_user_message ?? null,
      confidence: rest.confidence ?? null,
      intent: rest.intent ?? null,
      snippet: snippet || null,
    });

    if (error) {
      console.warn("[alerts] insert failed:", error.message);
    }
  } catch (err) {
    console.warn("[alerts] exception:", (err as Error).message);
  }
}