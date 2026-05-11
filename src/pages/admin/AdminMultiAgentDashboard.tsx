import { useCallback, useMemo, useState } from 'react';
import { useMultiAgentDashboard } from '@/hooks/useMultiAgentDashboard';
import { useChatbotAlerts } from '@/hooks/useChatbotAlerts';
import type { AgentDefinition } from '@/hooks/useMultiAgentDashboard';
import { DashboardLayout } from '@/features/multi-agent/DashboardLayout';

const AdminMultiAgentDashboard = () => {
  const { agents, allAgents, sessions, stats, activityLog, routingLogs, saveAgentConfig } = useMultiAgentDashboard();
  const [selectedAgent, setSelectedAgent] = useState<AgentDefinition | null>(null);
  // Subscribe globally so toast fires regardless of active tab
  const { data: alerts } = useChatbotAlerts({ onlyUnresolved: true });
  const unresolvedCount = (alerts || []).length;

  const handleSaveConfig = useCallback((configId: string, data: Record<string, unknown>) => {
    saveAgentConfig.mutate({ configId, data });
  }, [saveAgentConfig]);

  const layoutProps = useMemo(() => ({
    unresolvedCount,
    sessionsError: !!sessions.isError,
    stats,
    agents,
    allAgents,
    selectedAgent,
    setSelectedAgent,
    handleSaveConfig,
    isSaving: saveAgentConfig.isPending,
    sessions,
    activityLog,
    routingLogs,
  }), [unresolvedCount, sessions.isError, stats, agents, allAgents, selectedAgent, handleSaveConfig, saveAgentConfig.isPending, sessions, activityLog, routingLogs]);

  return (
    <DashboardLayout {...layoutProps} />
  );
};

export default AdminMultiAgentDashboard;
