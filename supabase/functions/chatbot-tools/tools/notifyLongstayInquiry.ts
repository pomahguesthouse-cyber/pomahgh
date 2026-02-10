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

/**
 * Notify superadmin via WhatsApp when a guest inquires about long-stay special pricing (3+ nights).
 */
export async function handleNotifyLongstayInquiry(
  supabase: SupabaseClient,
  params: LongstayParams
) {
  const FONNTE_API_KEY = Deno.env.get("FONNTE_API_KEY");
  if (!FONNTE_API_KEY) {
    console.error("FONNTE_API_KEY not configured");
    return { success: false, error: "WhatsApp notification not configured" };
  }

  // Get superadmin manager numbers from hotel_settings
  const { data: settings } = await supabase
    .from("hotel_settings")
    .select("whatsapp_manager_numbers, hotel_name")
    .single();

  const managers: Array<{ phone: string; name: string; role?: string }> =
    settings?.whatsapp_manager_numbers || [];

  // Filter superadmin managers
  const superAdmins = managers.filter(
    (m) => m.role === "super_admin" || m.role === "admin"
  );

  if (superAdmins.length === 0) {
    console.warn("No superadmin manager numbers configured");
    return {
      success: false,
      error: "No superadmin configured for notifications",
    };
  }

  const hotelName = settings?.hotel_name || "Hotel";

  // Build notification message
  const notifMessage = `🔔 *PERMINTAAN HARGA LONG STAY*

📍 ${hotelName}
👤 Tamu: ${params.guest_name || "Belum diketahui"}
📱 HP: ${params.guest_phone || "Belum diketahui"}
🛏️ Kamar: ${params.room_name || "Belum ditentukan"}
📅 Check-in: ${params.check_in || "-"}
📅 Check-out: ${params.check_out || "-"}
🌙 Durasi: ${params.num_nights || "3+"} malam

💬 Ringkasan: ${params.message_summary || "Tamu menanyakan harga khusus untuk menginap lebih dari 3 malam."}

⏰ ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}

_Silakan hubungi tamu untuk negosiasi harga long stay._`;

  // Send to all superadmins
  const results: Array<{ phone: string; success: boolean }> = [];

  for (const admin of superAdmins) {
    try {
      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: FONNTE_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: admin.phone,
          message: notifMessage,
        }),
      });

      const result = await response.json();
      console.log(
        `Notification sent to ${admin.name} (${admin.phone}):`,
        JSON.stringify(result)
      );
      results.push({ phone: admin.phone, success: !!result.status });
    } catch (err) {
      console.error(`Failed to notify ${admin.name}:`, err);
      results.push({ phone: admin.phone, success: false });
    }
  }

  const successCount = results.filter((r) => r.success).length;

  return {
    success: successCount > 0,
    notified_count: successCount,
    total_admins: superAdmins.length,
    message:
      successCount > 0
        ? `Notifikasi telah dikirim ke ${successCount} admin. Tamu diminta menunggu untuk penawaran harga khusus long stay.`
        : "Gagal mengirim notifikasi ke admin.",
  };
}
