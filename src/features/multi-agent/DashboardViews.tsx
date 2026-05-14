import { lazy, Suspense } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { AgentMetrics, AgentGrid, AgentConfigPanel, LiveChatView, ActivityLog, PromptStudio, EscalationFlow, SettingsPanel, ManagerNumbersPanel, ChatbotAlertsView } from '@/components/admin/multi-agent';
import type { AgentDefinition } from '@/hooks/useMultiAgentDashboard';

// Lazy-load analytics tab so recharts is fetched only when user opens
// the "analytics" tab — the rest of the dashboard never pulls it.
const AgentAnalytics = lazy(() =>
  import('@/components/admin/multi-agent/AgentAnalytics').then(m => ({ default: m.AgentAnalytics })),
);

interface DashboardViewsProps {
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

export const DashboardViews = ({
  stats,
  agents,
  allAgents,
  selectedAgent,
  setSelectedAgent,
  handleSaveConfig,
  isSaving,
  sessions,
  activityLog,
  routingLogs,
}: DashboardViewsProps) => (
  <>
    <TabsContent value="agents" className="mt-0">
      <AgentMetrics
        activeSessions={stats.data?.activeSessions || 0}
        bookingsToday={stats.data?.bookingsToday || 0}
        totalMessages={stats.data?.totalMessages || 0}
        escalations={stats.data?.escalations || 0}
      />
      <AgentGrid agents={agents} onSelectAgent={setSelectedAgent} selectedAgentId={selectedAgent?.id} />
      {selectedAgent && (
        <div className="p-4">
          <AgentConfigPanel
            key={selectedAgent.id}
            agent={selectedAgent}
            onClose={() => setSelectedAgent(null)}
            onSave={handleSaveConfig}
            isSaving={isSaving}
          />
        </div>
      )}
    </TabsContent>

    <TabsContent value="live-chat" className="mt-0 p-4">
      <LiveChatView sessions={(sessions.data || []) as never[]} />
    </TabsContent>

    <TabsContent value="logs" className="mt-0 p-4">
      <ActivityLog
        logs={(activityLog.data || []) as never[]}
        routingLogs={(routingLogs?.data || []) as never[]}
        isLoading={activityLog.isLoading}
      />
    </TabsContent>

    <TabsContent value="alerts" className="mt-0 p-4">
      <ChatbotAlertsView />
    </TabsContent>

    <TabsContent value="prompt" className="mt-0 p-4">
      <PromptStudio
        agents={agents}
        onSave={handleSaveConfig}
        isSaving={isSaving}
      />
    </TabsContent>

    <TabsContent value="analytics" className="mt-0 p-4">
      <Suspense fallback={<div className="h-96 rounded-md border bg-muted/30 animate-pulse" />}>
        <AgentAnalytics />
      </Suspense>
    </TabsContent>

    <TabsContent value="escalation" className="mt-0 p-4">
      <EscalationFlow agents={allAgents} />
    </TabsContent>

    <TabsContent value="managers" className="mt-0 p-4">
      <ManagerNumbersPanel />
    </TabsContent>

    <TabsContent value="settings" className="mt-0 p-4">
      <SettingsPanel />
    </TabsContent>
  </>
);
