import type { SupabaseClient } from '../types.ts';

/** Log message to database with parallel insert + atomic increment */
export async function logMessage(
  supabase: SupabaseClient,
  conversationId: string,
  role: string,
  content: string,
) {
  if (!conversationId) return;

  const [insertResult, rpcResult] = await Promise.all([
    supabase.from('chat_messages').insert({
      conversation_id: conversationId,
      role,
      content,
    }),
    supabase.rpc('increment_conversation_message_count', { conv_id: conversationId }),
  ]);

  if (insertResult.error) {
    console.warn(`[logMessage] Insert failed for ${conversationId}:`, insertResult.error.message);
  }
  if (rpcResult.error) {
    console.warn(`[logMessage] Increment failed for ${conversationId}:`, rpcResult.error.message);
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
