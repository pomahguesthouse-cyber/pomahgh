import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WhatsAppSession {
  id: string;
  phone_number: string;
  conversation_id: string | null;
  last_message_at: string | null;
  context: Record<string, unknown> | null;
  is_active: boolean | null;
  is_blocked: boolean | null;
  is_takeover: boolean | null;
  takeover_by: string | null;
  takeover_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface WhatsAppSessionWithMessages extends WhatsAppSession {
  chat_conversations: {
    id: string;
    message_count: number | null;
    booking_created: boolean | null;
    started_at: string | null;
    ended_at: string | null;
  } | null;
}

export const useWhatsAppSessions = () => {
  return useQuery({
    queryKey: ['whatsapp-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_sessions')
        .select(`
          *,
          chat_conversations (
            id,
            message_count,
            booking_created,
            started_at,
            ended_at
          )
        `)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      return data as WhatsAppSessionWithMessages[];
    },
  });
};

export const useWhatsAppSessionMessages = (conversationId: string | null) => {
  return useQuery({
    queryKey: ['whatsapp-session-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
  });
};

export const useToggleBlockSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isBlocked }: { id: string; isBlocked: boolean }) => {
      const { error } = await supabase
        .from('whatsapp_sessions')
        .update({ is_blocked: isBlocked, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { isBlocked }) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-sessions'] });
      toast.success(isBlocked ? 'Nomor diblokir' : 'Nomor dibuka blokir');
    },
    onError: () => {
      toast.error('Gagal mengubah status blokir');
    },
  });
};

export const useDeleteWhatsAppSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('whatsapp_sessions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-sessions'] });
      toast.success('Session dihapus');
    },
    onError: () => {
      toast.error('Gagal menghapus session');
    },
  });
};

export const useTakeoverSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('whatsapp_sessions')
        .update({ 
          is_takeover: true, 
          takeover_by: user?.id,
          takeover_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .eq('id', sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-sessions'] });
      toast.success('Percakapan diambil alih');
    },
    onError: () => {
      toast.error('Gagal mengambil alih percakapan');
    },
  });
};

export const useReleaseSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('whatsapp_sessions')
        .update({ 
          is_takeover: false, 
          takeover_by: null,
          takeover_at: null,
          updated_at: new Date().toISOString() 
        })
        .eq('id', sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-sessions'] });
      toast.success('Percakapan dikembalikan ke AI');
    },
    onError: () => {
      toast.error('Gagal mengembalikan percakapan');
    },
  });
};

export const useSendAdminMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      phoneNumber, 
      message, 
      conversationId 
    }: { 
      phoneNumber: string; 
      message: string; 
      conversationId: string | null;
    }) => {
      // Send WhatsApp message via edge function
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: { phone: phoneNumber, message, type: 'admin_reply' }
      });

      if (error) throw error;

      // Log message to chat_messages
      if (conversationId) {
        await supabase.from('chat_messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: message,
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-session-messages'] });
      toast.success('Pesan terkirim');
    },
    onError: (error) => {
      console.error('Send error:', error);
      toast.error('Gagal mengirim pesan');
    },
  });
};

export const useWhatsAppStats = () => {
  return useQuery({
    queryKey: ['whatsapp-stats'],
    queryFn: async () => {
      const { data: sessions, error: sessionsError } = await supabase
        .from('whatsapp_sessions')
        .select('id, is_blocked, is_active, is_takeover, conversation_id');

      if (sessionsError) throw sessionsError;

      const { data: conversations, error: convError } = await supabase
        .from('chat_conversations')
        .select('id, message_count, booking_created')
        .in('id', sessions?.filter(s => s.conversation_id).map(s => s.conversation_id) || []);

      if (convError) throw convError;

      const totalSessions = sessions?.length || 0;
      const activeSessions = sessions?.filter(s => s.is_active && !s.is_blocked).length || 0;
      const blockedSessions = sessions?.filter(s => s.is_blocked).length || 0;
      const takeoverSessions = sessions?.filter(s => s.is_takeover).length || 0;
      const totalMessages = conversations?.reduce((sum, c) => sum + (c.message_count || 0), 0) || 0;
      const bookingsCreated = conversations?.filter(c => c.booking_created).length || 0;

      return {
        totalSessions,
        activeSessions,
        blockedSessions,
        takeoverSessions,
        totalMessages,
        bookingsCreated,
        conversionRate: totalSessions > 0 ? ((bookingsCreated / totalSessions) * 100).toFixed(1) : '0',
      };
    },
  });
};
