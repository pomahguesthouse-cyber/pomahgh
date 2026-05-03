import type { SupabaseClient } from '../types.ts';

/** Log message to database with resilient fallback.
 *  PRIORITAS: insert pesan WAJIB berhasil. Increment counter bersifat best-effort.
 *  - Jika RPC gagal (mis. fungsi belum ada di skema cache), kita fallback ke
 *    UPDATE manual menggunakan COUNT pesan supaya counter tetap akurat.
 *  - Semua error ditangkap agar alur webhook tidak terputus. */
export async function logMessage(
  supabase: SupabaseClient,
  conversationId: string,
  role: string,
  content: string,
) {
  if (!conversationId) return;

  // Auto-detect fallback responses (technical error / generic apology) untuk asisten.
  // Ini membantu metric tracking tanpa harus modify setiap call site.
  const FALLBACK_RE = /(kendala teknis|maaf,?\s*(saya|aku)\s+(belum|tidak|gak|ga)\s+(bisa|dapat)|coba\s+lagi\s+nanti|sedang\s+(error|gangguan)|sistem\s+(error|gangguan|sedang)|technical\s+(error|issue))/i;
  const isFallback = role === 'assistant' && FALLBACK_RE.test(content);

  // 1) Insert pesan dulu (kritis). Tangkap exception agar webhook tidak crash.
  try {
    const { error: insertError } = await supabase.from('chat_messages').insert({
      conversation_id: conversationId,
      role,
      content,
      is_fallback: isFallback,
    });
    if (insertError) {
      console.warn(`[logMessage] Insert failed for ${conversationId}: ${insertError.message}`);
      // Pesan gagal tersimpan — tidak ada gunanya update counter
      return;
    }
  } catch (err) {
    console.warn(`[logMessage] Insert threw for ${conversationId}:`, (err as Error)?.message);
    return;
  }

  // 2) Increment counter (best-effort). Coba RPC dulu, fallback ke UPDATE manual.
  try {
    const { error: rpcError } = await supabase.rpc(
      'increment_conversation_message_count',
      { conv_id: conversationId },
    );
    if (!rpcError) return;

    console.warn(
      `[logMessage] RPC increment failed for ${conversationId} (${rpcError.message}), trying fallback...`,
    );

    // Fallback: hitung ulang via COUNT lalu UPDATE. Lebih lambat tapi akurat.
    const { count } = await supabase
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);

    if (typeof count === 'number') {
      const { error: updateError } = await supabase
        .from('chat_conversations')
        .update({ message_count: count })
        .eq('id', conversationId);
      if (updateError) {
        console.warn(
          `[logMessage] Fallback UPDATE failed for ${conversationId}: ${updateError.message}`,
        );
      }
    }
  } catch (err) {
    // Increment counter tidak boleh memutus alur — cukup log dan lanjut.
    console.warn(
      `[logMessage] Increment counter threw for ${conversationId}:`,
      (err as Error)?.message,
    );
  }
}

/** Get conversation history with smart truncation.
 *  Window dapat disetel admin via hotel_settings.whatsapp_history_window_messages.
 *  Untuk percakapan yang lebih panjang dari window, sistem mempertahankan
 *  ~12% pesan paling awal (initial context) + sisanya pesan terbaru. */
export async function getConversationHistory(
  supabase: SupabaseClient,
  conversationId: string,
  windowSize: number = 40,
): Promise<Array<{ role: string; content: string }>> {
  const window = Math.max(5, Math.min(windowSize, 200));
  const headSize = Math.max(2, Math.floor(window * 0.125)); // ~5 dari 40
  const tailSize = Math.max(window - headSize, 3);

  // Fast count-only query first to avoid fetching data we won't use
  const { count: totalCount } = await supabase
    .from('chat_messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId);

  const total = totalCount ?? 0;
  let selected: Array<{ role: string; content: string; created_at: string }>;

  if (total <= window) {
    // Short conversation — single fetch
    const { data } = await supabase
      .from('chat_messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(window);
    selected = data || [];
  } else {
    // Long conversation — fetch head + tail in parallel
    const [{ data: firstMsgs }, { data: lastMsgs }] = await Promise.all([
      supabase
        .from('chat_messages')
        .select('role, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(headSize),
      supabase
        .from('chat_messages')
        .select('role, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(tailSize),
    ]);

    const first = firstMsgs || [];
    const last = (lastMsgs || []).reverse();
    // Deduplicate if overlap
    const firstIds = new Set(first.map(m => m.created_at));
    const deduped = last.filter(m => !firstIds.has(m.created_at));

    selected = [
      ...first,
      { role: 'system', content: `[... ${total - first.length - deduped.length} pesan sebelumnya diringkas ...]`, created_at: '' },
      ...deduped,
    ];
  }

  return selected.map(m => {
    const content = m.content;
    if (content.startsWith('[System]')) {
      return { role: 'system', content: content.replace('[System] ', '') };
    }
    if (content.startsWith('[Admin]')) {
      return { role: 'assistant', content: `(Pesan dari admin/pengelola hotel): ${content.replace('[Admin] ', '')}` };
    }
    return { role: m.role, content };
  });
}
