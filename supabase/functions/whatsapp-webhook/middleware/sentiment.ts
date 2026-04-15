import type { ManagerInfo } from '../types.ts';

const NEGATIVE_SENTIMENT_PATTERNS = /\b(marah|kesal|kecewa|komplain|tidak puas|jelek|buruk|parah|mengecewakan|kapok|nyesel|menyesal|bohong|nipu|penipuan|tipu|gak profesional|tidak profesional|lambat banget|lama banget|gak beres|payah|zonk|sampah|brengsek|bangsat|anjing|goblok|tolol|bego|kampret|tai|babi|sialan)\b/i;
const NEGATIVE_EMOJI_PATTERNS = /😡|😤|🤬|💢|😠|👎/;

/**
 * Fire-and-forget: detect negative sentiment and alert super admin managers
 */
export function detectAndAlertNegativeSentiment(
  userMessage: string,
  phone: string,
  guestName: string | null | undefined,
  managerNumbers: ManagerInfo[],
  fonnteApiKey: string,
  conversationId: string | undefined,
) {
  const isNegative = NEGATIVE_SENTIMENT_PATTERNS.test(userMessage) || NEGATIVE_EMOJI_PATTERNS.test(userMessage);
  if (!isNegative) return;

  const superAdmins = managerNumbers.filter(m => m.role === 'super_admin');
  if (superAdmins.length === 0) return;

  const displayName = guestName || `Tamu WA ${phone.slice(-4)}`;
  const alertMessage = `⚠️ *ALERT: Tamu Tidak Puas*

👤 ${displayName} (${phone})
💬 "${userMessage.substring(0, 200)}"

Segera cek dan ambil alih percakapan jika diperlukan.
🔗 Conversation ID: ${conversationId || '-'}`;

  for (const admin of superAdmins) {
    fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': fonnteApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ target: admin.phone, message: alertMessage }),
    }).then(r => r.json()).then(res => {
      console.log(`🚨 Negative sentiment alert sent to ${admin.name} (${admin.phone}):`, res.status ? 'success' : 'failed');
    }).catch(err => {
      console.error(`🚨 Failed to send alert to ${admin.name}:`, err);
    });
  }

  console.log(`🚨 Negative sentiment detected from ${phone}: "${userMessage.substring(0, 80)}..." — alerting ${superAdmins.length} super admin(s)`);
}
