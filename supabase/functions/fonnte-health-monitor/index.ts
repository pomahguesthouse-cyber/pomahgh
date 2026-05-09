import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ManagerNumber {
  name?: string;
  role?: string;
  phone: string;
}

/**
 * Fonnte Health Monitor
 * - Polls Fonnte device status
 * - Computes idle time since last inbound WhatsApp message
 * - Sends WhatsApp alert to super_admin numbers when:
 *   (a) device disconnected, OR
 *   (b) no inbound message for >= idle threshold minutes
 * - Cooldown to avoid spam
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const FONNTE_API_KEY = Deno.env.get("FONNTE_API_KEY") ?? "";

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    // Load settings
    const { data: settings } = await supabase
      .from("hotel_settings")
      .select("fonnte_health_check_enabled, fonnte_idle_alert_minutes, fonnte_alert_cooldown_minutes, whatsapp_manager_numbers")
      .limit(1)
      .maybeSingle();

    if (!settings?.fonnte_health_check_enabled) {
      return json({ skipped: true, reason: "disabled" });
    }

    const idleMinutes = Number(settings.fonnte_idle_alert_minutes ?? 60);
    const cooldownMinutes = Number(settings.fonnte_alert_cooldown_minutes ?? 30);
    const managers = (settings.whatsapp_manager_numbers ?? []) as ManagerNumber[];
    const alertTargets = managers.filter((m) => m?.role === "super_admin" && m?.phone).map((m) => m.phone);

    // 1. Fetch Fonnte device status
    let deviceStatus = "unknown";
    let deviceConnected = false;
    let raw: unknown = null;
    let fonnteError: string | null = null;

    if (!FONNTE_API_KEY) {
      fonnteError = "FONNTE_API_KEY not configured";
    } else {
      try {
        const r = await fetch("https://api.fonnte.com/device", {
          method: "POST",
          headers: { Authorization: FONNTE_API_KEY },
        });
        raw = await r.json();
        const rawObj = raw as Record<string, unknown>;
        // Fonnte device endpoint returns: { status: true, device_status: "connect"|"disconnect", ... }
        // status (boolean) = API call succeeded; device_status (string) = actual connection state
        const apiOk = rawObj?.status === true || String(rawObj?.status).toLowerCase() === "true";
        const ds = String(rawObj?.device_status ?? rawObj?.connected ?? "").toLowerCase();
        deviceStatus = ds || (apiOk ? "unknown" : "api_error");
        deviceConnected = apiOk && ds.includes("connect") && !ds.includes("disconnect");
        if (!apiOk) {
          fonnteError = String(rawObj?.reason ?? rawObj?.detail ?? "Fonnte API returned status=false");
        }
      } catch (e) {
        fonnteError = e instanceof Error ? e.message : "fonnte fetch failed";
      }
    }

    // 2. Last inbound WA message — chat_messages.role='user' tied to a whatsapp_session
    const { data: lastInbound } = await supabase
      .from("chat_messages")
      .select("created_at, conversation_id")
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(50);

    let lastInboundAt: string | null = null;
    if (lastInbound && lastInbound.length > 0) {
      const convIds = [...new Set(lastInbound.map((m) => m.conversation_id).filter(Boolean))];
      const { data: waSessions } = await supabase
        .from("whatsapp_sessions")
        .select("conversation_id")
        .in("conversation_id", convIds);
      const waConvIds = new Set((waSessions ?? []).map((s) => s.conversation_id));
      const firstWA = lastInbound.find((m) => waConvIds.has(m.conversation_id));
      lastInboundAt = firstWA?.created_at ?? null;
    }

    const now = Date.now();
    const minutesSince = lastInboundAt
      ? Math.floor((now - new Date(lastInboundAt).getTime()) / 60000)
      : null;
    const isIdle = minutesSince !== null && minutesSince >= idleMinutes;

    // 3. Decide alert
    const reasons: string[] = [];
    if (!deviceConnected && !fonnteError) reasons.push(`device ${deviceStatus || "unknown"}`);
    if (fonnteError) reasons.push(`Fonnte API error: ${fonnteError}`);
    if (isIdle) reasons.push(`tidak ada pesan masuk ${minutesSince} menit (>= ${idleMinutes} menit)`);

    let alertSent = false;
    let alertReason: string | null = null;

    if (reasons.length > 0) {
      // Cooldown: any alert sent within cooldownMinutes?
      const cutoff = new Date(now - cooldownMinutes * 60_000).toISOString();
      const { count: recentAlerts } = await supabase
        .from("fonnte_health_checks")
        .select("*", { count: "exact", head: true })
        .eq("alert_sent", true)
        .gte("checked_at", cutoff);

      if ((recentAlerts ?? 0) === 0 && alertTargets.length > 0) {
        alertReason = reasons.join("; ");
        const lastInboundStr = lastInboundAt
          ? new Date(lastInboundAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
          : "tidak diketahui";
        const message =
          `🚨 *Peringatan Fonnte WhatsApp*\n\n` +
          `Status device: *${deviceStatus}*\n` +
          `Pesan masuk terakhir: ${lastInboundStr}\n` +
          `Penyebab: ${alertReason}\n\n` +
          `Mohon cek dashboard Fonnte & koneksi WhatsApp.`;

        // Send via send-whatsapp function (uses service role)
        for (const phone of alertTargets) {
          try {
            await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SERVICE_ROLE}`,
              },
              body: JSON.stringify({ phone, message, type: "fonnte_alert" }),
            });
          } catch (e) {
            console.error("alert send failed", phone, e);
          }
        }
        alertSent = true;
      }
    }

    // 4. Log result
    await supabase.from("fonnte_health_checks").insert({
      device_status: deviceStatus,
      device_connected: deviceConnected,
      last_inbound_at: lastInboundAt,
      minutes_since_last_inbound: minutesSince,
      is_idle: isIdle,
      alert_sent: alertSent,
      alert_reason: alertReason,
      raw_response: raw as Record<string, unknown> | null,
      error_message: fonnteError,
    });

    return json({
      ok: true,
      device_status: deviceStatus,
      device_connected: deviceConnected,
      last_inbound_at: lastInboundAt,
      minutes_since: minutesSince,
      is_idle: isIdle,
      alert_sent: alertSent,
      alert_reason: alertReason,
    });
  } catch (e) {
    console.error("fonnte-health-monitor error", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}