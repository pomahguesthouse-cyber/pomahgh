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

/** Get conversation history (20 newest, reversed to chronological) */
export async function getConversationHistory(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<Array<{ role: string; content: string }>> {
  const { data: history } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(20);

  return (history || []).reverse().map(m => {
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
