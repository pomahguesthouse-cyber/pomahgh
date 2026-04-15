import type { SupabaseClient } from '../types.ts';

/** Log message to database with parallel insert + atomic increment */
export async function logMessage(
  supabase: SupabaseClient,
  conversationId: string,
  role: string,
  content: string,
) {
  if (!conversationId) return;

  await Promise.all([
    supabase.from('chat_messages').insert({
      conversation_id: conversationId,
      role,
      content,
    }),
    supabase.rpc('increment_conversation_message_count', { conv_id: conversationId }),
  ]);
}

/** Get conversation history with smart truncation.
 *  Keeps first 5 messages (initial context) + last 25 (recent state).
 *  For conversations ≤ 30 messages, returns all. */
export async function getConversationHistory(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<Array<{ role: string; content: string }>> {
  const { data: allMessages, count } = await supabase
    .from('chat_messages')
    .select('role, content, created_at', { count: 'exact' })
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(30);

  const messages = allMessages || [];
  const totalCount = count ?? messages.length;

  let selected: typeof messages;

  if (totalCount <= 30) {
    // Short conversation — use all already fetched
    selected = messages;
  } else {
    // Long conversation — fetch first 5 + last 25
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
        .limit(25),
    ]);

    const first = firstMsgs || [];
    const last = (lastMsgs || []).reverse();
    // Deduplicate if overlap
    const firstIds = new Set(first.map(m => m.created_at));
    const deduped = last.filter(m => !firstIds.has(m.created_at));

    selected = [
      ...first,
      { role: 'system', content: `[... ${totalCount - first.length - deduped.length} pesan sebelumnya diringkas ...]`, created_at: '' },
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
