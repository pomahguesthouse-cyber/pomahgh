import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getWIBNow } from '@/utils/wibTimezone';
import { format } from 'date-fns';

// ─── Types ───────────────────────────────────────────────
export interface AgentDecision {
  id: string;
  trace_id: string | null;
  conversation_id: string | null;
  phone_number: string | null;
  from_agent: string;
  to_agent: string | null;
  reason: string | null;
  intent: string | null;
  confidence: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AgentToolLog {
  id: string;
  trace_id: string | null;
  conversation_id: string | null;
  tool_name: string;
  arguments: Record<string, unknown>;
  result_status: 'success' | 'pending' | 'failed';
  result_summary: string | null;
  duration_ms: number | null;
  error_message: string | null;
  agent_name: string | null;
  created_at: string;
}

export interface ActiveConversation {
  id: string;
  session_id: string | null;
  message_count: number;
  started_at: string;
  booking_created: boolean | null;
  last_message?: string;
  last_message_at?: string;
  guest_name?: string | null;
}

export interface ConversationMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

export interface ConversationDetail {
  messages: ConversationMessage[];
  context: Record<string, unknown>;
  decisions: AgentDecision[];
  toolCalls: AgentToolLog[];
}

export interface AgentAnalytics {
  totalChats: number;
  bookingConversion: number;
  dropOffRate: number;
  revenueToday: number;
  activeUsers: number;
}

export type SystemStatus = 'active' | 'degraded' | 'down';

// ─── Hook ────────────────────────────────────────────────
export function useAgentDashboard() {
  const [decisions, setDecisions] = useState<AgentDecision[]>([]);
  const [toolLogs, setToolLogs] = useState<AgentToolLog[]>([]);
  const [conversations, setConversations] = useState<ActiveConversation[]>([]);
  const [analytics, setAnalytics] = useState<AgentAnalytics>({
    totalChats: 0,
    bookingConversion: 0,
    dropOffRate: 0,
    revenueToday: 0,
    activeUsers: 0,
  });
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ConversationDetail | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>('active');
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<Array<{ id: string; message: string; tool?: string; created_at: string }>>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Fetch decisions ────────────
  const fetchDecisions = useCallback(async () => {
    const { data } = await supabase
      .from('agent_decision_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setDecisions(data as unknown as AgentDecision[]);
  }, []);

  // ─── Fetch tool logs ────────────
  const fetchToolLogs = useCallback(async () => {
    const { data } = await supabase
      .from('agent_tool_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) {
      const logs = data as unknown as AgentToolLog[];
      setToolLogs(logs);
      // Extract recent errors
      const recentErrors = logs
        .filter(l => l.result_status === 'failed' && l.error_message)
        .slice(0, 5)
        .map(l => ({
          id: l.id,
          message: l.error_message!,
          tool: l.tool_name,
          created_at: l.created_at,
        }));
      setErrors(recentErrors);
    }
  }, []);

  // ─── Fetch active conversations ────────────
  const fetchConversations = useCallback(async () => {
    const today = format(getWIBNow(), 'yyyy-MM-dd');

    const { data } = await supabase
      .from('chat_conversations')
      .select('id, session_id, message_count, started_at, booking_created')
      .gte('started_at', `${today}T00:00:00`)
      .order('started_at', { ascending: false })
      .limit(30);

    if (data) {
      setConversations(data as unknown as ActiveConversation[]);
    }
  }, []);

  // ─── Fetch analytics ────────────
  const fetchAnalytics = useCallback(async () => {
    const today = format(getWIBNow(), 'yyyy-MM-dd');

    const [convResult, bookingResult, revenueResult, sessionResult] = await Promise.all([
      // Total chats today
      supabase
        .from('chat_conversations')
        .select('id, booking_created', { count: 'exact' })
        .gte('started_at', `${today}T00:00:00`),
      // Bookings created from chat today
      supabase
        .from('chat_conversations')
        .select('id', { count: 'exact' })
        .gte('started_at', `${today}T00:00:00`)
        .eq('booking_created', true),
      // Revenue today
      supabase
        .from('bookings')
        .select('total_price')
        .eq('payment_status', 'paid')
        .gte('created_at', `${today}T00:00:00`),
      // Active sessions
      supabase
        .from('whatsapp_sessions')
        .select('id', { count: 'exact' })
        .eq('is_active', true),
    ]);

    const totalChats = convResult.count || 0;
    const bookingsCreated = bookingResult.count || 0;
    const revenue = (revenueResult.data || []).reduce(
      (sum, b) => sum + ((b as { total_price: number }).total_price || 0), 0
    );
    const activeUsers = sessionResult.count || 0;

    // Drop-off: conversations with messages but no booking and no active in last 30min
    const dropOff = totalChats > 0
      ? Math.round(((totalChats - bookingsCreated) / totalChats) * 100 * 10) / 10
      : 0;

    setAnalytics({
      totalChats,
      bookingConversion: totalChats > 0 ? Math.round((bookingsCreated / totalChats) * 1000) / 10 : 0,
      dropOffRate: dropOff,
      revenueToday: revenue,
      activeUsers,
    });

    // Derive system status from recent tool failures
    const recentFails = (toolLogs || []).filter(
      t => t.result_status === 'failed' &&
        new Date(t.created_at).getTime() > Date.now() - 5 * 60 * 1000
    ).length;
    setSystemStatus(recentFails >= 5 ? 'down' : recentFails >= 2 ? 'degraded' : 'active');
  }, [toolLogs]);

  // ─── Fetch conversation detail ────────────
  const fetchConversationDetail = useCallback(async (convId: string) => {
    setSelectedConvId(convId);

    const [msgResult, decResult, toolResult] = await Promise.all([
      supabase
        .from('chat_messages')
        .select('id, role, content, created_at')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true }),
      supabase
        .from('agent_decision_logs')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true }),
      supabase
        .from('agent_tool_logs')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true }),
    ]);

    // Extract context from whatsapp session if available
    const conv = conversations.find(c => c.id === convId);
    let context: Record<string, unknown> = {};
    if (conv?.session_id?.startsWith('wa_')) {
      const phone = conv.session_id.replace('wa_', '').split('_')[0];
      const { data: session } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .eq('phone_number', phone)
        .single();
      if (session) {
        context = session as unknown as Record<string, unknown>;
      }
    }

    setSelectedDetail({
      messages: (msgResult.data || []) as unknown as ConversationMessage[],
      context,
      decisions: (decResult.data || []) as unknown as AgentDecision[],
      toolCalls: (toolResult.data || []) as unknown as AgentToolLog[],
    });
  }, [conversations]);

  // ─── Dismiss error ────────────
  const dismissError = useCallback((id: string) => {
    setErrors(prev => prev.filter(e => e.id !== id));
  }, []);

  // ─── Initial load + polling ────────────
  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchDecisions(),
        fetchToolLogs(),
        fetchConversations(),
      ]);
      await fetchAnalytics();
      setIsLoading(false);
    };

    loadAll();

    // Poll every 15 seconds
    intervalRef.current = setInterval(() => {
      fetchDecisions();
      fetchToolLogs();
      fetchConversations();
      fetchAnalytics();
      // Refresh selected conversation if open
      if (selectedConvId) {
        fetchConversationDetail(selectedConvId);
      }
    }, 15000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Realtime subscriptions ────────────
  useEffect(() => {
    const channel = supabase
      .channel('agent-dashboard-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'agent_decision_logs',
      }, (payload) => {
        setDecisions(prev => [payload.new as unknown as AgentDecision, ...prev].slice(0, 50));
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'agent_tool_logs',
      }, (payload) => {
        const newLog = payload.new as unknown as AgentToolLog;
        setToolLogs(prev => [newLog, ...prev].slice(0, 50));
        if (newLog.result_status === 'failed' && newLog.error_message) {
          setErrors(prev => [{
            id: newLog.id,
            message: newLog.error_message!,
            tool: newLog.tool_name,
            created_at: newLog.created_at,
          }, ...prev].slice(0, 5));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    // Data
    decisions,
    toolLogs,
    conversations,
    analytics,
    systemStatus,
    selectedConvId,
    selectedDetail,
    errors,
    isLoading,
    // Actions
    selectConversation: fetchConversationDetail,
    dismissError,
    refresh: async () => {
      await Promise.all([fetchDecisions(), fetchToolLogs(), fetchConversations()]);
      await fetchAnalytics();
    },
  };
}
