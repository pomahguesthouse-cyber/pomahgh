/**
 * Payment Proof OCR Handler
 * 
 * Triggered when a guest sends an image while they have a pending payment booking.
 * Flow:
 * 1. Download image from Fonnte URL
 * 2. Extract data via Lovable AI (Gemini vision): amount, sender, bank, date, ref
 * 3. Auto-match against the latest pending booking by phone
 * 4. Notify ALL managers with extraction summary + match status
 * 5. Reply to guest acknowledging receipt
 */
import type { SupabaseClient, EnvConfig, ManagerInfo } from '../types.ts';
import { corsHeaders } from '../types.ts';
import { sendWhatsApp } from '../services/fonnte.ts';
import { logMessage } from '../services/conversation.ts';
import type { TraceContext } from '../../_shared/traceContext.ts';
import { logAgentDecision } from '../../_shared/agentLogger.ts';
import { sendBookingOrderToGuest } from '../services/sendBookingOrder.ts';

interface PaymentProofExtraction {
  is_payment_proof: boolean;
  confidence: 'high' | 'medium' | 'low';
  amount: number | null;
  sender_name: string | null;
  bank_name: string | null;
  transfer_date: string | null;
  reference_number: string | null;
  notes: string | null;
}

interface PendingBookingRow {
  id: string;
  booking_code: string;
  guest_name: string;
  total_price: number;
  payment_status: string | null;
  check_in: string;
  check_out: string;
}

const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

/** Find the most recent pending-payment booking for this phone */
async function findPendingBooking(
  supabase: SupabaseClient,
  phone: string,
): Promise<PendingBookingRow | null> {
  const normalizedPhone = phone.startsWith('62') ? '0' + phone.slice(2) : phone;
  const { data } = await supabase
    .from('bookings')
    .select('id, booking_code, guest_name, total_price, payment_status, check_in, check_out')
    .in('guest_phone', [phone, normalizedPhone])
    .in('payment_status', ['pending', 'unpaid'])
    .in('status', ['pending_payment', 'confirmed'])
    .order('created_at', { ascending: false })
    .limit(1);
  return data && data.length > 0 ? (data[0] as PendingBookingRow) : null;
}

/** Extract a PMH-XXXXXX booking code from a free-text caption (e.g. admin caption). */
export function extractBookingCodeFromText(text: string | null | undefined): string | null {
  if (!text) return null;
  const m = text.match(/PMH-[A-Z0-9]{6}/i);
  return m ? m[0].toUpperCase() : null;
}

/** Find booking by explicit booking_code (used for admin-submitted proofs). */
async function findBookingByCode(
  supabase: SupabaseClient,
  bookingCode: string,
): Promise<PendingBookingRow | null> {
  const { data } = await supabase
    .from('bookings')
    .select('id, booking_code, guest_name, total_price, payment_status, check_in, check_out')
    .eq('booking_code', bookingCode)
    .limit(1)
    .maybeSingle();
  return data ? (data as PendingBookingRow) : null;
}

/** Find the most recent pending-payment booking across the whole hotel (admin fallback). */
async function findLatestPendingBookingAnywhere(
  supabase: SupabaseClient,
): Promise<PendingBookingRow | null> {
  const { data } = await supabase
    .from('bookings')
    .select('id, booking_code, guest_name, total_price, payment_status, check_in, check_out')
    .in('payment_status', ['pending', 'unpaid'])
    .in('status', ['pending_payment', 'confirmed'])
    .order('created_at', { ascending: false })
    .limit(1);
  return data && data.length > 0 ? (data[0] as PendingBookingRow) : null;
}

/** Download image and convert to base64 data URL */
async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    const resp = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!resp.ok) return null;
    const contentType = resp.headers.get('content-type') || 'image/jpeg';
    if (!ALLOWED_IMAGE_MIME.some(t => contentType.includes(t.split('/')[1]))) {
      console.warn(`Unsupported image type: ${contentType}`);
      return null;
    }
    const bytes = new Uint8Array(await resp.arrayBuffer());
    if (bytes.length > MAX_IMAGE_BYTES) {
      console.warn(`Image too large: ${bytes.length} bytes`);
      return null;
    }
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return `data:${contentType};base64,${btoa(binary)}`;
  } catch (e) {
    console.error('Image fetch error:', e);
    return null;
  }
}

/**
 * Use Lovable AI Gemini vision (OCR + financial parser) to extract payment proof data.
 *
 * System brief (per Pomah payment-agent spec):
 *   You are an OCR + financial parser.
 *   From the uploaded payment proof image, extract:
 *     - Transfer amount
 *     - Transaction date
 *     - Sender name
 *     - Bank name
 *     - Reference number (if any)
 *   Return JSON. If a field is unclear, return null.
 */
async function extractWithVision(imageDataUrl: string): Promise<PaymentProofExtraction | null> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    console.error('LOVABLE_API_KEY missing');
    return null;
  }

  try {
    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: [
              'You are an OCR + financial parser specialized in Indonesian bank transfer & e-wallet receipts',
              '(BCA, BRI, Mandiri, BNI, BSI, CIMB, OVO, GoPay, DANA, ShopeePay, LinkAja, QRIS, etc.).',
              '',
              'From the uploaded payment proof image, extract:',
              '  - Transfer amount (in Rupiah, integer, no separators)',
              '  - Transaction date (Indonesian format: "DD MMM YYYY", e.g. "15 Jan 2025")',
              '  - Sender name (the person/account who SENT the money — never the recipient)',
              '  - Bank name (or e-wallet name)',
              '  - Reference number (transaction ID / kode unik / no. referensi if visible)',
              '',
              'Rules:',
              '  - If a field is unclear or not visible, return null for that field.',
              '  - Set is_payment_proof=false if image is not a transfer/payment receipt (e.g. selfie, room photo, screenshot of chat).',
              '  - Set confidence = "high" only when ALL key fields (amount + sender + bank) are clearly readable.',
              '  - Return data ONLY via the extract_payment_proof function call.',
            ].join('\n'),
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Ekstrak data bukti transfer dari gambar berikut. Jika ada field tidak jelas, kembalikan null.' },
              { type: 'image_url', image_url: { url: imageDataUrl } },
            ],
          },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'extract_payment_proof',
            description: 'Return structured extraction of a payment proof image (OCR + financial parser).',
            parameters: {
              type: 'object',
              properties: {
                is_payment_proof: { type: 'boolean', description: 'true if image is a transfer/payment receipt' },
                confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
                amount: { type: ['number', 'null'], description: 'Transfer amount in Rupiah, integer, no separators. Null if unclear.' },
                sender_name: { type: ['string', 'null'], description: 'Name of the SENDER. Null if unclear.' },
                bank_name: { type: ['string', 'null'], description: 'Bank or e-wallet name (BCA, GoPay, etc.). Null if unclear.' },
                transfer_date: { type: ['string', 'null'], description: 'Transaction date as "DD MMM YYYY" Indonesian. Null if unclear.' },
                reference_number: { type: ['string', 'null'], description: 'Reference / transaction ID. Null if not visible.' },
                notes: { type: ['string', 'null'], description: 'Anything unusual (e.g. failed transfer, wrong recipient).' },
              },
              required: ['is_payment_proof', 'confidence'],
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'extract_payment_proof' } },
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error(`Vision API error ${resp.status}: ${txt.substring(0, 200)}`);
      return null;
    }

    const data = await resp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.warn('Vision did not return tool call');
      return null;
    }
    const parsed = JSON.parse(toolCall.function.arguments) as PaymentProofExtraction;
    console.log(`🧾 OCR result: amount=${parsed.amount}, sender=${parsed.sender_name}, bank=${parsed.bank_name}, ref=${parsed.reference_number}, confidence=${parsed.confidence}`);
    return parsed;
  } catch (e) {
    console.error('Vision extraction error:', e);
    return null;
  }
}

const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

/**
 * Main handler — extracts proof, matches booking, notifies managers, replies to sender.
 *
 * If `submittedByManager` is provided, the proof is treated as admin-submitted:
 *   - Booking lookup uses caption (booking code) → fallback latest pending hotel-wide
 *   - OCR result is ALWAYS auto-approved (admin is trusted, no YA/TIDAK loop)
 */
export async function handlePaymentProof(
  supabase: SupabaseClient,
  phone: string,
  imageUrl: string,
  conversationId: string,
  managerNumbers: ManagerInfo[],
  env: EnvConfig,
  trace?: TraceContext,
  options?: { submittedByManager?: ManagerInfo | null; caption?: string | null },
): Promise<Response> {
  const submittedByManager = options?.submittedByManager ?? null;
  const caption = options?.caption ?? null;
  const isAdminSubmission = !!submittedByManager;

  console.log(`🧾 Payment proof handler: phone=${phone}, image=${imageUrl.substring(0, 80)}, admin=${isAdminSubmission}`);
  await logMessage(supabase, conversationId, 'user', `[Image attached${isAdminSubmission ? ' by admin' : ''}] ${imageUrl}${caption ? ` | caption: ${caption}` : ''}`);

  logAgentDecision(supabase, {
    trace_id: trace?.traceId, conversation_id: conversationId, phone_number: phone,
    from_agent: 'orchestrator', to_agent: 'payment_proof',
    reason: isAdminSubmission ? 'admin_payment_proof_upload' : 'image_with_pending_payment',
  });

  // 1. Find matching booking
  let booking: PendingBookingRow | null = null;
  if (isAdminSubmission) {
    // Admin: prefer caption booking code, then fall back to latest pending in the hotel
    const codeFromCaption = extractBookingCodeFromText(caption);
    if (codeFromCaption) {
      booking = await findBookingByCode(supabase, codeFromCaption);
      if (!booking) {
        const reply = `Booking *${codeFromCaption}* tidak ditemukan. Mohon cek kode booking di caption foto.`;
        await sendWhatsApp(phone, reply, env.fonnteApiKey);
        await logMessage(supabase, conversationId, 'assistant', reply);
        return new Response(JSON.stringify({ status: 'admin_booking_not_found', code: codeFromCaption }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      booking = await findLatestPendingBookingAnywhere(supabase);
      if (!booking) {
        const reply = 'Tidak ada booking pending yang menunggu pembayaran. Sertakan kode booking (PMH-XXXXXX) di caption foto untuk booking tertentu.';
        await sendWhatsApp(phone, reply, env.fonnteApiKey);
        await logMessage(supabase, conversationId, 'assistant', reply);
        return new Response(JSON.stringify({ status: 'admin_no_pending_booking' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
  } else {
    booking = await findPendingBooking(supabase, phone);
    if (!booking) {
      // No pending booking — soft acknowledge
      const reply = 'Terima kasih sudah mengirim gambar 🙏 Namun kami belum menemukan booking aktif atas nomor ini. Mohon hubungi admin atau buat booking dulu ya.';
      await sendWhatsApp(phone, reply, env.fonnteApiKey);
      await logMessage(supabase, conversationId, 'assistant', reply);
      return new Response(JSON.stringify({ status: 'no_pending_booking' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // 2. Download + OCR (run in parallel-friendly sequence)
  const dataUrl = await fetchImageAsDataUrl(imageUrl);
  let extraction: PaymentProofExtraction | null = null;
  if (dataUrl) {
    extraction = await extractWithVision(dataUrl);
  }

  // 3. Save payment proof URL to booking
  await supabase
    .from('bookings')
    .update({ payment_proof_url: imageUrl, updated_at: new Date().toISOString() })
    .eq('id', booking.id);

  // 3a. Persist structured OCR result to payment_proofs table
  let proofId: string | null = null;
  try {
    const { data: proofRow } = await supabase.from('payment_proofs').insert({
      booking_id: booking.id,
      phone,
      image_url: imageUrl,
      is_payment_proof: extraction?.is_payment_proof ?? false,
      confidence: extraction?.confidence ?? null,
      amount: extraction?.amount ?? null,
      sender_name: extraction?.sender_name ?? null,
      bank_name: extraction?.bank_name ?? null,
      transfer_date: extraction?.transfer_date ?? null,
      reference_number: extraction?.reference_number ?? null,
      notes: extraction?.notes ?? null,
      raw_extraction: extraction ?? null,
      source: isAdminSubmission ? 'whatsapp_admin' : 'whatsapp',
      status: 'pending',
    }).select('id').single();
    proofId = proofRow?.id ?? null;
  } catch (e) {
    console.warn('payment_proofs insert failed', e);
  }

  // 3b. Load template config for auto-verify behaviour
  const { data: template } = await supabase
    .from('invoice_templates')
    .select('auto_verify_ocr, manual_review_mode, ocr_confidence_threshold, notify_guest_on_approve')
    .limit(1)
    .maybeSingle();

  const autoVerifyEnabled = !!template?.auto_verify_ocr && !template?.manual_review_mode;
  const confidenceThreshold = template?.ocr_confidence_threshold ?? 90;

  // 4. Build manager notification
  const hotelTime = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  let matchStatus = '🔍 *Belum bisa diverifikasi otomatis*';
  let matchEmoji = '⚠️';
  let autoApproved = false;

  if (extraction?.is_payment_proof) {
    if (extraction.amount && extraction.amount >= booking.total_price * 0.95) {
      // Within 5% tolerance (covers unique code variations)
      matchStatus = `✅ *MATCH* — Nominal sesuai (${formatRp(extraction.amount)} vs ${formatRp(booking.total_price)})`;
      matchEmoji = '✅';

      // Auto-approve if enabled & confidence high enough — OR if submitted by admin
      const confidenceScore = extraction.confidence === 'high' ? 95
        : extraction.confidence === 'medium' ? 75
        : 50;
      if (isAdminSubmission || (autoVerifyEnabled && confidenceScore >= confidenceThreshold)) {
        autoApproved = true;
        await supabase
          .from('bookings')
          .update({
            payment_status: 'paid',
            status: 'confirmed',
            payment_amount: extraction.amount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', booking.id);
        matchStatus = isAdminSubmission
          ? `🎉 *AUTO-APPROVED (oleh ${submittedByManager!.name})* — booking otomatis di-set LUNAS.`
          : `🎉 *AUTO-APPROVED* (confidence ${extraction.confidence}, threshold ${confidenceThreshold}%) — booking otomatis di-set LUNAS.`;
      }
    } else if (extraction.amount) {
      matchStatus = `⚠️ *MISMATCH* — Nominal: ${formatRp(extraction.amount)} (booking: ${formatRp(booking.total_price)})`;
      matchEmoji = '⚠️';
    } else {
      matchStatus = '⚠️ *Nominal tidak terbaca* — perlu cek manual';
    }
  } else if (extraction) {
    matchStatus = '❌ *Bukan bukti transfer* — gambar tidak terdeteksi sebagai struk';
    matchEmoji = '❌';
  }

  // Admin override: if admin submitted and OCR didn't auto-approve (mismatch / unreadable amount),
  // still trust the admin and mark as paid. Admin is authoritative for payment confirmation.
  if (isAdminSubmission && !autoApproved && extraction) {
    autoApproved = true;
    await supabase
      .from('bookings')
      .update({
        payment_status: 'paid',
        status: 'confirmed',
        payment_amount: extraction.amount ?? booking.total_price,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking.id);
    matchStatus = `🎉 *AUTO-APPROVED (oleh admin ${submittedByManager!.name})* — pembayaran dikonfirmasi manual oleh admin (OCR tidak match).`;
    matchEmoji = '✅';
  }

  const extractionLines: string[] = [];
  if (extraction?.amount) extractionLines.push(`💵 Nominal: ${formatRp(extraction.amount)}`);
  if (extraction?.sender_name) extractionLines.push(`👤 Pengirim: ${extraction.sender_name}`);
  if (extraction?.bank_name) extractionLines.push(`🏦 Bank: ${extraction.bank_name}`);
  if (extraction?.transfer_date) extractionLines.push(`📅 Tgl: ${extraction.transfer_date}`);
  if (extraction?.reference_number) extractionLines.push(`#️⃣ Ref: ${extraction.reference_number}`);
  if (extraction?.confidence) extractionLines.push(`🎯 Confidence: ${extraction.confidence}`);

  const managerMsg = `${matchEmoji} *BUKTI BAYAR MASUK*

📋 *${booking.booking_code}* — ${booking.guest_name}
📱 ${phone}
📅 ${booking.check_in} → ${booking.check_out}
💰 Booking: ${formatRp(booking.total_price)}

🤖 *HASIL OCR:*
${extractionLines.length > 0 ? extractionLines.join('\n') : '(gagal ekstrak data dari gambar)'}

${matchStatus}

🖼️ Bukti: ${imageUrl}

⏰ ${hotelTime}

${autoApproved ? '_Pembayaran sudah otomatis dikonfirmasi. Tidak perlu balas._' : '_Balas *YA* / *OK* untuk konfirmasi pembayaran, atau *TIDAK* jika tidak match._'}`;

  // 5. Send to all managers & store pending_proof_id in their sessions for scoped approval
  const managers = managerNumbers.length > 0 ? managerNumbers : [];
  await Promise.allSettled(
    managers.map(async (m) => {
      await sendWhatsApp(m.phone, managerMsg, env.fonnteApiKey);
      // Store proof ID in manager's session so paymentApproval can scope correctly
      if (proofId && !autoApproved) {
        await supabase.from('whatsapp_sessions')
          .update({ context: { pending_proof_id: proofId } })
          .eq('phone_number', m.phone);
      }
    }),
  );

  // 6. Acknowledge sender (admin gets short receipt; guest gets full message)
  let senderReply: string;
  if (isAdminSubmission) {
    senderReply = autoApproved
      ? `✅ Bukti transfer untuk *${booking.booking_code}* (${booking.guest_name}) berhasil dikonfirmasi LUNAS.\n💰 ${formatRp(extraction?.amount ?? booking.total_price)}\n📨 Booking order otomatis dikirim ke WA tamu.`
      : `⚠️ Foto diterima untuk booking *${booking.booking_code}* (${booking.guest_name}) tapi OCR gagal mengekstrak data. Mohon cek manual di dashboard.`;
  } else if (autoApproved) {
    senderReply = `🎉 Halo *${booking.guest_name}*!\n\nPembayaran untuk booking *${booking.booking_code}* sebesar *${formatRp(extraction!.amount!)}* sudah *DIKONFIRMASI LUNAS* secara otomatis ✅\n\nTerima kasih, kami tunggu kedatangan Anda 🙏`;
  } else if (extraction?.is_payment_proof && extraction.amount && extraction.amount >= booking.total_price * 0.95) {
    senderReply = `Terima kasih *${booking.guest_name}* 🙏\n\nBukti transfer sebesar *${formatRp(extraction.amount)}* untuk booking *${booking.booking_code}* sudah kami terima. Tim kami sedang memverifikasi, mohon ditunggu sebentar ya ✨`;
  } else if (extraction?.is_payment_proof) {
    senderReply = `Terima kasih, bukti transfer sudah kami terima 🙏\n\nUntuk booking *${booking.booking_code}* — tim kami akan cek dan konfirmasi via WhatsApp segera. Mohon ditunggu ya 🙏`;
  } else {
    senderReply = `Terima kasih sudah mengirim gambar 🙏\n\nTim kami akan cek dan menghubungi Anda kembali untuk konfirmasi pembayaran booking *${booking.booking_code}* ya.`;
  }

  await sendWhatsApp(phone, senderReply, env.fonnteApiKey);
  await logMessage(supabase, conversationId, 'assistant', senderReply);

  // 7. Jika auto-approved → kirim booking order (PDF invoice) ke WA tamu + tandai proof approved
  let bookingOrderSent = false;
  if (autoApproved) {
    const orderResult = await sendBookingOrderToGuest(booking.id, env);
    bookingOrderSent = !!orderResult.whatsapp_sent;

    // Update payment_proofs row jadi 'approved' (latest pending utk booking ini)
    await supabase
      .from('payment_proofs')
      .update({ status: 'approved', verified_at: new Date().toISOString() })
      .eq('booking_id', booking.id)
      .eq('status', 'pending');

    // Notif manager bahwa booking order sudah dikirim
    if (bookingOrderSent && managers.length > 0) {
      await Promise.allSettled(
        managers.map(m => sendWhatsApp(
          m.phone,
          `📨 Booking order *${booking.booking_code}* sudah otomatis dikirim ke WhatsApp tamu (${booking.guest_name}).`,
          env.fonnteApiKey,
        )),
      );
    }
  }

  return new Response(JSON.stringify({
    status: 'payment_proof_processed',
    booking_id: booking.id,
    extraction,
    auto_approved: autoApproved,
    booking_order_sent: bookingOrderSent,
    notified_managers: managers.length,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Detect if webhook body indicates an image attachment.
 * Fonnte sends: `url` field with media URL when guest sends image.
 */
export function extractImageUrl(body: Record<string, unknown>): string | null {
  const url = typeof body.url === 'string' ? body.url
    : typeof body.file === 'string' ? body.file
    : typeof body.media === 'string' ? body.media
    : null;
  if (!url) return null;
  // Filter only image URLs (skip docs, audio, etc.)
  const lower = url.toLowerCase();
  if (lower.match(/\.(jpe?g|png|webp|gif|bmp|heic)(\?|$)/) || lower.includes('image')) {
    return url;
  }
  return null;
}
