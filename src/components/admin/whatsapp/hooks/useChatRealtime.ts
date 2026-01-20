import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ChatMessage } from '../types';

/**
 * Hook for optimistic realtime message updates
 * Appends new messages directly to cache instead of refetching
 */
export const useChatRealtime = (conversationId: string | null, enabled: boolean) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!conversationId || !enabled) return;

    const channel = supabase
      .channel(`chat-realtime-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          // Optimistic update - append directly to cache
          queryClient.setQueryData<ChatMessage[]>(
            ['whatsapp-session-messages', conversationId],
            (old) => {
              if (!old) return [payload.new as ChatMessage];
              // Avoid duplicates
              const exists = old.some(msg => msg.id === (payload.new as ChatMessage).id);
              if (exists) return old;
              return [...old, payload.new as ChatMessage];
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, enabled, queryClient]);
};
