import { useState, useRef, useEffect } from 'react';
import { 
  useWhatsAppSessionMessages, 
  useSendAdminMessage,
  WhatsAppSessionWithMessages 
} from '@/hooks/useWhatsAppSessions';
import { useChatRealtime } from './useChatRealtime';

/**
 * Hook that encapsulates admin chat logic (no release functionality)
 */
export const useAdminChat = (session: WhatsAppSessionWithMessages, open: boolean) => {
  const { data: messages } = useWhatsAppSessionMessages(session.conversation_id);
  const sendMessage = useSendAdminMessage();
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Use optimistic realtime updates
  useChatRealtime(session.conversation_id, open);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async () => {
    if (!newMessage.trim()) return;
    
    await sendMessage.mutateAsync({
      phoneNumber: session.phone_number,
      message: newMessage,
      conversationId: session.conversation_id,
    });
    
    setNewMessage('');
  };

  return {
    messages,
    newMessage,
    setNewMessage,
    send,
    scrollRef,
    isSending: sendMessage.isPending,
  };
};












