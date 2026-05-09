/**
 * WhatsApp Conversation State Machine
 *
 * Persisted di kolom `whatsapp_sessions.conversation_state`. Tujuannya menjaga
 * agar alur pesan (booking, pembayaran, takeover, fallback) konsisten lintas
 * pesan tanpa kehilangan konteks — orchestrator/agen bisa membuat keputusan
 * berdasarkan state, bukan menebak ulang dari riwayat tiap kali.
 *
 * States:
 *  - `idle`                       → tidak ada flow aktif; default antar pesan biasa.
 *  - `awaiting_name`              → bot sudah tanya nama, menunggu jawaban tamu.
 *  - `booking_in_progress`        → tamu sedang dalam alur booking (pilih kamar/tanggal).
 *  - `awaiting_payment_proof`     → booking sudah dibuat, menunggu bukti transfer.
 *  - `awaiting_payment_approval`  → bukti diterima, menunggu manager APPROVE/REJECT.
 *  - `takeover`                   → admin manusia mengambil alih; AI berhenti membalas.
 *  - `closed`                     → sesi diakhiri (mis. tamu sudah lewat checkout terakhir).
 *
 * Transition table di bawah hanyalah panduan (soft guard); jika ada transisi
 * tak terduga kita log warning tapi tetap mengizinkan agar flow tidak deadlock.
 */

import type { SupabaseClient } from '../types.ts';

export type ConversationState =
  | 'idle'
  | 'awaiting_name'
  | 'booking_in_progress'
  | 'awaiting_payment_proof'
  | 'awaiting_payment_approval'
  | 'takeover'
  | 'closed';

export const CONVERSATION_STATES: ConversationState[] = [
  'idle',
  'awaiting_name',
  'booking_in_progress',
  'awaiting_payment_proof',
  'awaiting_payment_approval',
  'takeover',
  'closed',
];

/**
 * Allowed transitions. `takeover` & `closed` & `idle` selalu boleh dari mana
 * pun karena admin/sistem bisa memaksa reset kapan saja.
 */
const ALLOWED: Record<ConversationState, ConversationState[]> = {
  idle: ['awaiting_name', 'booking_in_progress', 'awaiting_payment_proof', 'takeover', 'closed', 'idle'],
  awaiting_name: ['idle', 'booking_in_progress', 'takeover', 'closed'],
  booking_in_progress: ['awaiting_payment_proof', 'idle', 'takeover', 'closed'],
  awaiting_payment_proof: ['awaiting_payment_approval', 'booking_in_progress', 'idle', 'takeover', 'closed'],
  awaiting_payment_approval: ['idle', 'awaiting_payment_proof', 'takeover', 'closed'],
  takeover: ['idle', 'closed'], // hanya bisa dilepas oleh admin / reset
  closed: ['idle'], // dimulai ulang sebagai sesi baru
};

export function isValidState(s: unknown): s is ConversationState {
  return typeof s === 'string' && (CONVERSATION_STATES as string[]).includes(s);
}

export function isAllowedTransition(from: ConversationState | null | undefined, to: ConversationState): boolean {
  if (!from) return true; // first-time write
  if (!isValidState(from)) return true;
  if (from === to) return true;
  return (ALLOWED[from] ?? []).includes(to);
}

export interface TransitionOptions {
  /** Phone number — required key untuk update. */
  phone: string;
  /** Conversation id — kalau ada, dipakai untuk audit log ke chat_messages. */
  conversationId?: string | null;
  /** State sebelumnya (untuk validasi). Boleh null kalau belum tahu. */
  from?: ConversationState | null;
  /** State target. */
  to: ConversationState;
  /** Alasan singkat untuk audit. */
  reason: string;
}

/**
 * Pindahkan state percakapan + tulis audit log. Best-effort: kegagalan tidak
 * pernah dilempar ke caller karena state machine bersifat advisory; flow utama
 * tetap harus berjalan walau update ini gagal.
 */
export async function transitionState(
  supabase: SupabaseClient,
  opts: TransitionOptions,
): Promise<{ ok: boolean; reason?: string }> {
  const { phone, conversationId, from, to, reason } = opts;

  if (!isValidState(to)) {
    console.warn(`[state] invalid target state "${to}" for ${phone}`);
    return { ok: false, reason: 'invalid_target' };
  }

  if (!isAllowedTransition(from ?? null, to)) {
    console.warn(`[state] disallowed transition ${from ?? 'null'} → ${to} for ${phone} (reason=${reason}); applying anyway`);
  }

  try {
    const { error } = await supabase
      .from('whatsapp_sessions')
      .update({
        conversation_state: to,
        last_message_at: new Date().toISOString(),
      })
      .eq('phone_number', phone);
    if (error) {
      console.warn(`[state] update failed for ${phone}: ${error.message}`);
      return { ok: false, reason: error.message };
    }
  } catch (err) {
    console.warn(`[state] update exception for ${phone}:`, err);
    return { ok: false, reason: 'exception' };
  }

  // Audit log (best-effort)
  if (conversationId) {
    try {
      await supabase.from('chat_messages').insert({
        conversation_id: conversationId,
        role: 'system',
        content: `🔁 [STATE] ${from ?? 'null'} → ${to} (${reason})`,
      });
    } catch (err) {
      console.warn('[state] audit insert failed:', err);
    }
  }

  return { ok: true };
}

/** Ambil state aman dari session row. Default `idle` kalau belum di-set. */
export function getState(session: { conversation_state?: string | null } | null | undefined): ConversationState {
  const s = session?.conversation_state;
  return isValidState(s) ? s : 'idle';
}