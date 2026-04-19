import type { SupabaseClient } from '../types.ts';

const MESSAGE_BATCH_WAIT_MS = 1500;
const MESSAGE_BATCH_FOLLOWUP_MS = 1000;
const MESSAGE_BATCH_MAX_WAIT_MS = 5000;

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
  const { error: rpcError } = await supabase.rpc('append_pending_message', { p_phone: phone, p_message: newMessage });
  if (rpcError) {
    console.error(`📦 append_pending_message failed for ${phone}:`, rpcError.message);

    // Check if another invocation already appended this message to avoid duplicates
    const { data: existing } = await supabase
      .from('whatsapp_sessions')
      .select('pending_messages')
      .eq('phone_number', phone)
      .maybeSingle();

    const pending = existing?.pending_messages as string[] | null;
    if (pending && pending.includes(newMessage)) {
      console.log(`📦 RPC failed but message already in pending buffer, deferring to other invocation for ${phone}`);
      return null;
    }

    // Message truly not in buffer — process it directly as single message
    return [newMessage];
  }

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

  // Use optimistic locking even on max-wait timeout to prevent race condition
  const { data: claimed } = await supabase
    .from('whatsapp_sessions')
    .update({ pending_messages: [], pending_since: null })
    .eq('phone_number', phone)
    .eq('pending_since', session.pending_since)
    .select('pending_messages')
    .single();

  if (!claimed) {
    console.log(`📦 Max wait: batch already claimed by another invocation for ${phone}`);
    return null;
  }

  console.log(`📦 Max wait exceeded, processing ${session.pending_messages.length} messages for ${phone}`);
  return session.pending_messages;
}
