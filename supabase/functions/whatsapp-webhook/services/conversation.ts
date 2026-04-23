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
 *  Keeps first 5 messages (initial context) + last 35 (recent state).
 *  For conversations ≤ 40 messages, returns all.
 *  Window diperluas untuk mendukung retensi memory hingga H+2 check-out
 *  pada percakapan booking yang panjang. */
export async function getConversationHistory(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<Array<{ role: string; content: string }>> {
  // Fast count-only query first to avoid fetching data we won't use
  const { count: totalCount } = await supabase
    .from('chat_messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId);

  const total = totalCount ?? 0;
  let selected: Array<{ role: string; content: string; created_at: string }>;

  if (total <= 40) {
    // Short conversation — single fetch
    const { data } = await supabase
      .from('chat_messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(40);
    selected = data || [];
  } else {
    // Long conversation — fetch first 5 + last 35 in parallel
    const [{ data: firstMsgs }, { data: lastMsgs }] = await Promise.all([
      supabase
        .from('chat_messages')
        .select('role, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(5),
      supabase
        .from('chat_messages')
        .select('role, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(35),
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
