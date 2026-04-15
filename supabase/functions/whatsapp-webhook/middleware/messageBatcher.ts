import type { SupabaseClient } from '../types.ts';

const MESSAGE_BATCH_WAIT_MS = 3000;
const MESSAGE_BATCH_FOLLOWUP_MS = 2000;
const MESSAGE_BATCH_MAX_WAIT_MS = 10000;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Add message to pending buffer and attempt to become the processor.
 * Returns the combined messages if this invocation should process, or null if another will.
 */
export async function batchMessages(
  supabase: SupabaseClient,
  phone: string,
  newMessage: string
): Promise<string[] | null> {
  await supabase.rpc('append_pending_message', { p_phone: phone, p_message: newMessage });

  const startTime = Date.now();
  let lastCount = 0;

  while (Date.now() - startTime < MESSAGE_BATCH_MAX_WAIT_MS) {
    const waitMs = lastCount === 0 ? MESSAGE_BATCH_WAIT_MS : MESSAGE_BATCH_FOLLOWUP_MS;
    await sleep(waitMs);

    const { data: session } = await supabase
      .from('whatsapp_sessions')
      .select('pending_messages, pending_since')
      .eq('phone_number', phone)
      .single();

    const currentMessages = session?.pending_messages || [];

    if (currentMessages.length === 0) {
      console.log(`📦 Batch already processed by another invocation for ${phone}`);
      return null;
    }

    if (currentMessages.length === lastCount) {
      const { data: claimed } = await supabase
        .from('whatsapp_sessions')
        .update({ pending_messages: [], pending_since: null })
        .eq('phone_number', phone)
        .eq('pending_since', session?.pending_since)
        .select('pending_messages')
        .single();

      if (!claimed) {
        console.log(`📦 Batch claimed by another invocation for ${phone}`);
        return null;
      }

      console.log(`📦 Batch collected ${currentMessages.length} messages for ${phone}: ${JSON.stringify(currentMessages)}`);
      return currentMessages;
    }

    lastCount = currentMessages.length;
    console.log(`📦 More messages arrived (${currentMessages.length}), waiting more for ${phone}`);
  }

  const { data: session } = await supabase
    .from('whatsapp_sessions')
    .select('pending_messages, pending_since')
    .eq('phone_number', phone)
    .single();

  if (!session?.pending_messages?.length) return null;

  await supabase
    .from('whatsapp_sessions')
    .update({ pending_messages: [], pending_since: null })
    .eq('phone_number', phone);

  console.log(`📦 Max wait exceeded, processing ${session.pending_messages.length} messages for ${phone}`);
  return session.pending_messages;
}
