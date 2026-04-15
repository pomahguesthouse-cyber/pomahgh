import { useQuery, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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
  category: 'core' | 'specialist' | 'manager';
  escalationTarget?: string;
  prompt?: string;
  temperature?: number;
  maxTurns?: number;
  isActive?: boolean;
  autoEscalate?: boolean;
  configId?: string;
  knowledgeBaseEnabled?: boolean;
  knowledgeBaseTypes?: string[];
  canSendMedia?: boolean;
}

const BACKEND_FILES: Record<string, string> = {
  orchestrator: 'orchestrator.ts',
  intent: 'intent.ts',
  booking: 'booking.ts',
  faq: 'faq.ts',
  pricing: 'pricing.ts',
  manager: 'manager.ts',
};

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_routing_logs' }, () => {
        queryClient.invalidateQueries({ queryKey: ['multi-agent-routing-logs'] });
        queryClient.invalidateQueries({ queryKey: ['multi-agent-stats'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Load agent configs from DB
  const agentConfigsQuery = useQuery({
    queryKey: ['multi-agent-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_configs')
        .select('*')
        .order('created_at');
      if (error) throw error;
      return data;
    },
  });

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

  // Routing logs for real agent activity
  const routingLogsQuery = useQuery({
    queryKey: ['multi-agent-routing-logs'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from('agent_routing_logs')
        .select('*')
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000,
  });

  const statsQuery = useQuery({
    queryKey: ['multi-agent-stats'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: sessions } = await supabase
        .from('whatsapp_sessions')
        .select('id, is_active, is_blocked, is_takeover, conversation_id, session_type');

      const { data: todayConvs } = await supabase
        .from('chat_conversations')
        .select('id, message_count, booking_created')
        .gte('started_at', today.toISOString());

      const { data: todayRoutings } = await supabase
        .from('agent_routing_logs')
        .select('from_agent, to_agent, duration_ms')
        .gte('created_at', today.toISOString());

      const activeSessions = sessions?.filter(s => s.is_active && !s.is_blocked).length || 0;
      const bookingsToday = todayConvs?.filter(c => c.booking_created).length || 0;
      const escalations = sessions?.filter(s => s.is_takeover).length || 0;
      const totalMessages = todayConvs?.reduce((sum, c) => sum + (c.message_count || 0), 0) || 0;

      // Real avg response time from routing logs
      const durations = todayRoutings?.filter(r => r.duration_ms && r.duration_ms > 0).map(r => r.duration_ms!) || [];
      const avgResponseMs = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

      // Per-agent routing counts
      const agentRoutingCounts: Record<string, number> = {};
      todayRoutings?.forEach(r => {
        if (r.to_agent) {
          agentRoutingCounts[r.to_agent] = (agentRoutingCounts[r.to_agent] || 0) + 1;
        }
      });

      return {
        activeSessions, bookingsToday, escalations, totalMessages,
        totalConversationsToday: todayConvs?.length || 0,
        avgResponseMs,
        agentRoutingCounts,
        totalRoutings: todayRoutings?.length || 0,
      };
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

  // Build agent list from DB configs + live session data
  const agents: AgentDefinition[] = (agentConfigsQuery.data || []).map(config => {
    const activeSessions = sessionsQuery.data?.filter(s => s.is_active && !s.is_blocked) || [];
    const guestSessions = activeSessions.filter(s => (s as Record<string, unknown>).session_type !== 'admin');
    const managerSessions = activeSessions.filter(s => (s as Record<string, unknown>).session_type === 'admin');
    const routingCounts = statsQuery.data?.agentRoutingCounts || {};

    let status: AgentDefinition['status'] = 'idle';
    let chatCount = routingCounts[config.agent_id] || 0;

    switch (config.agent_id) {
      case 'orchestrator':
        status = activeSessions.length > 0 ? 'active' : 'idle';
        chatCount = activeSessions.length;
        break;
      case 'intent':
        const awaitingName = activeSessions.filter(s => (s as Record<string, unknown>).awaiting_name === true);
        status = awaitingName.length > 0 ? 'active' : (activeSessions.length > 0 ? 'active' : 'idle');
        chatCount = awaitingName.length || routingCounts['intent'] || 0;
        break;
      case 'booking':
        status = guestSessions.length > 0 ? 'active' : 'idle';
        chatCount = routingCounts['booking'] || guestSessions.length;
        break;
      case 'faq':
        status = guestSessions.length > 0 ? 'active' : 'idle';
        chatCount = routingCounts['faq'] || 0;
        break;
      case 'pricing':
        status = managerSessions.length > 0 ? 'active' : 'idle';
        chatCount = routingCounts['pricing'] || 0;
        break;
      case 'manager':
        status = managerSessions.length > 0 ? 'active' : 'idle';
        chatCount = routingCounts['manager'] || managerSessions.length;
        break;
    }

    if (!config.is_active) status = 'idle';

    // Success rate from routing logs (tool failures = errors)
    const todayLogs = routingLogsQuery.data || [];
    const agentLogs = todayLogs.filter(l => l.from_agent === config.agent_id);
    const failedLogs = agentLogs.filter(l => l.reason === 'failed');
    const successRate = agentLogs.length > 0
      ? Number(((1 - failedLogs.length / agentLogs.length) * 100).toFixed(1))
      : 100;

    return {
      id: config.agent_id,
      name: config.name,
      role: config.role,
      icon: config.icon,
      backendFile: BACKEND_FILES[config.agent_id] || `${config.agent_id}.ts`,
      status,
      chatCount,
      successRate,
      avgResponseTime: statsQuery.data?.avgResponseMs
        ? `${(statsQuery.data.avgResponseMs / 1000).toFixed(1)}s`
        : '-',
      tags: config.tags || [],
      category: config.category as AgentDefinition['category'],
      escalationTarget: config.escalation_target || undefined,
      prompt: config.system_prompt || undefined,
      temperature: config.temperature ? Number(config.temperature) : 0.3,
      maxTurns: config.max_turns || 10,
      isActive: config.is_active ?? true,
      autoEscalate: config.auto_escalate ?? true,
      configId: config.id,
    };
  });

  // Save agent config mutation
  const saveAgentConfig = useMutation({
    mutationFn: async (update: { configId: string; data: Record<string, unknown> }) => {
      const { error } = await supabase
        .from('agent_configs')
        .update(update.data)
        .eq('id', update.configId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['multi-agent-configs'] });
      toast.success('Konfigurasi agent berhasil disimpan');
    },
    onError: (err) => {
      toast.error(`Gagal menyimpan: ${err.message}`);
    },
  });

  return {
    agents,
    sessions: sessionsQuery,
    stats: statsQuery,
    activityLog: activityLogQuery,
    routingLogs: routingLogsQuery,
    agentConfigs: agentConfigsQuery,
    saveAgentConfig,
  };
};
