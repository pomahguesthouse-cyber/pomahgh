import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  icon: string;
  backendFile: string;
  status: 'active' | 'idle' | 'busy' | 'error';
  chatCount: number;
  successRate: number;
  avgResponseTime: string;
  tags: string[];
  escalationTarget?: string;
  prompt?: string;
  temperature?: number;
  maxTurns?: number;
}

const AGENT_DEFINITIONS: Omit<AgentDefinition, 'status' | 'chatCount' | 'successRate' | 'avgResponseTime'>[] = [
  { id: 'orchestrator', name: 'Orchestrator', role: 'Koordinator utama semua agent', icon: '🎯', backendFile: 'orchestrator.ts', tags: ['core', 'routing'] },
  { id: 'intent', name: 'Intent Router', role: 'Deteksi intent & routing percakapan', icon: '🔀', backendFile: 'intent.ts', tags: ['core', 'nlp'] },
  { id: 'booking', name: 'Reservasi Bot', role: 'Booking, check-in/out, extend stay', icon: '📅', backendFile: 'booking.ts', tags: ['booking', 'crud'], escalationTarget: 'manager' },
  { id: 'faq', name: 'CS & FAQ Bot', role: 'Jawab pertanyaan umum & fasilitas', icon: '💬', backendFile: 'faq.ts', tags: ['faq', 'info'], escalationTarget: 'booking' },
  { id: 'pricing', name: 'Pricing Bot', role: 'Harga kamar & kalkulasi biaya', icon: '💰', backendFile: 'pricing.ts', tags: ['pricing', 'calc'], escalationTarget: 'booking' },
  { id: 'manager', name: 'Manager Bot', role: 'Eskalasi & keputusan manajerial', icon: '👔', backendFile: 'manager.ts', tags: ['escalation', 'admin'] },
];

export const useMultiAgentDashboard = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('multi-agent-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_sessions' }, () => {
        queryClient.invalidateQueries({ queryKey: ['multi-agent-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['multi-agent-stats'] });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => {
        queryClient.invalidateQueries({ queryKey: ['multi-agent-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['multi-agent-activity-log'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const sessionsQuery = useQuery({
    queryKey: ['multi-agent-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_sessions')
        .select(`*, chat_conversations(id, message_count, booking_created, started_at, ended_at)`)
        .order('last_message_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const statsQuery = useQuery({
    queryKey: ['multi-agent-stats'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: sessions } = await supabase
        .from('whatsapp_sessions')
        .select('id, is_active, is_blocked, is_takeover, conversation_id');

      const { data: todayConvs } = await supabase
        .from('chat_conversations')
        .select('id, message_count, booking_created')
        .gte('started_at', today.toISOString());

      const activeSessions = sessions?.filter(s => s.is_active && !s.is_blocked).length || 0;
      const bookingsToday = todayConvs?.filter(c => c.booking_created).length || 0;
      const escalations = sessions?.filter(s => s.is_takeover).length || 0;
      const totalMessages = todayConvs?.reduce((sum, c) => sum + (c.message_count || 0), 0) || 0;

      return { activeSessions, bookingsToday, escalations, totalMessages, totalConversationsToday: todayConvs?.length || 0 };
    },
  });

  const activityLogQuery = useQuery({
    queryKey: ['multi-agent-activity-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, role, content, created_at, conversation_id, tool_calls_used, is_fallback')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });

  const agents: AgentDefinition[] = AGENT_DEFINITIONS.map(def => {
    const activeSessions = sessionsQuery.data?.filter(s => s.is_active && !s.is_blocked) || [];
    const isCore = def.id === 'orchestrator' || def.id === 'intent';
    const chatCount = isCore ? activeSessions.length : Math.floor(activeSessions.length / (AGENT_DEFINITIONS.length - 2));

    return {
      ...def,
      status: isCore ? 'active' as const : (chatCount > 0 ? 'active' as const : 'idle' as const),
      chatCount,
      successRate: 95 + Math.random() * 5,
      avgResponseTime: `${(1 + Math.random() * 2).toFixed(1)}s`,
    };
  });

  return { agents, sessions: sessionsQuery, stats: statsQuery, activityLog: activityLogQuery };
};
