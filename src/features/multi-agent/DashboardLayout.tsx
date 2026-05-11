import { memo } from 'react';
import { Tabs } from '@/components/ui/tabs';
import { TopBar } from '@/components/admin/multi-agent';
import { DashboardTabs } from './DashboardTabs';
import { DashboardViews } from './DashboardViews';
import type { AgentDefinition } from '@/hooks/useMultiAgentDashboard';

interface DashboardLayoutProps {
  unresolvedCount: number;
  sessionsError: boolean;
  stats: { data?: { activeSessions?: number; bookingsToday?: number; totalMessages?: number; escalations?: number } };
  agents: AgentDefinition[];
  allAgents: AgentDefinition[];
  selectedAgent: AgentDefinition | null;
  setSelectedAgent: (agent: AgentDefinition | null) => void;
  handleSaveConfig: (configId: string, data: Record<string, unknown>) => void;
  isSaving: boolean;
  sessions: { data?: Array<Record<string, unknown>> };
  activityLog: { data?: Array<Record<string, unknown>>; isLoading: boolean };
  routingLogs: { data?: Array<Record<string, unknown>> } | undefined;
}

const DashboardLayoutComponent = (props: DashboardLayoutProps) => (
  <div className="space-y-0 bg-background min-h-screen">
    <TopBar isConnected={!props.sessionsError} />

    <Tabs defaultValue="agents" className="w-full">
      <DashboardTabs unresolvedCount={props.unresolvedCount} />
      <DashboardViews
        stats={props.stats}
        agents={props.agents}
        allAgents={props.allAgents}
        selectedAgent={props.selectedAgent}
        setSelectedAgent={props.setSelectedAgent}
        handleSaveConfig={props.handleSaveConfig}
        isSaving={props.isSaving}
        sessions={props.sessions}
        activityLog={props.activityLog}
        routingLogs={props.routingLogs}
      />
    </Tabs>
  </div>
);

export const DashboardLayout = memo(DashboardLayoutComponent);
