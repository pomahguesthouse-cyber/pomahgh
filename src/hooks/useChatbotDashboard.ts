import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export interface DashboardSession {
  id: string;
  phone_number: string;
  guest_name: string | null;
  conversation_id: string | null;
  last_message_at: string | null;
  is_active: boolean | null;
  is_blocked: boolean | null;
  is_takeover: boolean | null;
  session_type: string | null;
  context: Record<string, unknown> | null;
  created_at: string | null;
}

export interface DashboardMessage {
  id: string;
  role: string;
  content: string;
  created_at: string | null;
  conversation_id: string | null;
  tool_calls_used: string[] | null;
  is_fallback: boolean | null;
}

export interface DashboardAnalytics {
  totalChats: number;
  activeChats: number;
  bookingConversions: number;
  conversionRate: string;
  totalMessages: number;
  takeoverSessions: number;
}

export const useDashboardSessions = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-sessions-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_sessions' }, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-sessions'] });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-messages'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return useQuery({
    queryKey: ['dashboard-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .order('last_message_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as DashboardSession[];
    },
    refetchInterval: 15000,
  });
};

export const useDashboardMessages = (conversationId: string | null) => {
  return useQuery({
    queryKey: ['dashboard-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as DashboardMessage[];
    },
    enabled: !!conversationId,
  });
};

export const useDashboardAnalytics = () => {
  return useQuery({
    queryKey: ['dashboard-analytics'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data: sessions } = await supabase
        .from('whatsapp_sessions')
        .select('id, is_active, is_blocked, is_takeover, conversation_id');

      const { data: conversations } = await supabase
        .from('chat_conversations')
        .select('id, message_count, booking_created, started_at');

      const todayConvs = conversations?.filter(c => c.started_at?.startsWith(today)) || [];
      const totalChats = conversations?.length || 0;
      const activeChats = sessions?.filter(s => s.is_active && !s.is_blocked).length || 0;
      const bookingConversions = conversations?.filter(c => c.booking_created).length || 0;
      const totalMessages = conversations?.reduce((sum, c) => sum + (c.message_count || 0), 0) || 0;
      const takeoverSessions = sessions?.filter(s => s.is_takeover).length || 0;

      return {
        totalChats,
        activeChats,
        bookingConversions,
        conversionRate: totalChats > 0 ? ((bookingConversions / totalChats) * 100).toFixed(1) : '0',
        totalMessages,
        takeoverSessions,
      } as DashboardAnalytics;
    },
    refetchInterval: 30000,
  });
};
