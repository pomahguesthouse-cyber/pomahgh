/**
 * Send Booking Order Helper
 * 
 * Dipanggil setelah pembayaran dikonfirmasi LUNAS (auto atau manual).
 * Memicu generate-invoice edge function dengan flag send_whatsapp=true,
 * sehingga PDF invoice/booking confirmation otomatis terkirim ke WhatsApp tamu.
 */
import type { EnvConfig } from '../types.ts';

export async function sendBookingOrderToGuest(
  bookingId: string,
  env: EnvConfig,
): Promise<{ success: boolean; whatsapp_sent?: boolean; error?: string }> {
  try {
    const resp = await fetch(`${env.supabaseUrl}/functions/v1/generate-invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.supabaseServiceKey}`,
      },
      body: JSON.stringify({
        booking_id: bookingId,
        send_email: true,
        send_whatsapp: true,
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error(`generate-invoice failed ${resp.status}: ${txt.substring(0, 200)}`);
      return { success: false, error: `HTTP ${resp.status}` };
    }

    const data = await resp.json();
    console.log(`📨 Booking order sent for ${bookingId}: wa=${data.whatsapp_sent}, email=${data.email_sent}`);
    return { success: true, whatsapp_sent: !!data.whatsapp_sent };
  } catch (e) {
    console.error('sendBookingOrder error:', e);
    return { success: false, error: String(e) };
  }
}
