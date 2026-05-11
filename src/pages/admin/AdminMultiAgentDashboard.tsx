import { useState } from 'react';
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

  const handleSaveConfig = (configId: string, data: Record<string, unknown>) => {
    saveAgentConfig.mutate({ configId, data });
  };

  return (
    <DashboardLayout
      unresolvedCount={unresolvedCount}
      sessionsError={!!sessions.isError}
      stats={stats}
      agents={agents}
      allAgents={allAgents}
      selectedAgent={selectedAgent}
      setSelectedAgent={setSelectedAgent}
      handleSaveConfig={handleSaveConfig}
      isSaving={saveAgentConfig.isPending}
      sessions={sessions}
      activityLog={activityLog}
      routingLogs={routingLogs}
    />
  );
};

export default AdminMultiAgentDashboard;
