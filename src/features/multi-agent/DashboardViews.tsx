import { lazy, memo, Suspense } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { AgentMetrics, AgentGrid, AgentConfigPanel, ActivityLog } from '@/components/admin/multi-agent';
import type { AgentDefinition } from '@/hooks/useMultiAgentDashboard';

const LiveChatView = lazy(() => import('@/components/admin/multi-agent/LiveChatView').then(m => ({ default: m.LiveChatView })));
const PromptStudio = lazy(() => import('@/components/admin/multi-agent/PromptStudio').then(m => ({ default: m.PromptStudio })));
const EscalationFlow = lazy(() => import('@/components/admin/multi-agent/EscalationFlow').then(m => ({ default: m.EscalationFlow })));
const SettingsPanel = lazy(() => import('@/components/admin/multi-agent/SettingsPanel').then(m => ({ default: m.SettingsPanel })));
const AgentAnalytics = lazy(() => import('@/components/admin/multi-agent/AgentAnalytics').then(m => ({ default: m.AgentAnalytics })));
const ManagerNumbersPanel = lazy(() => import('@/components/admin/multi-agent/ManagerNumbersPanel').then(m => ({ default: m.ManagerNumbersPanel })));
const ChatbotAlertsView = lazy(() => import('@/components/admin/multi-agent/ChatbotAlertsView').then(m => ({ default: m.ChatbotAlertsView })));

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

const DashboardViewsComponent = ({
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
      <Suspense fallback={<div className="text-xs text-muted-foreground">Memuat live chat…</div>}>
        <LiveChatView sessions={(sessions.data || []) as never[]} />
      </Suspense>
    </TabsContent>

    <TabsContent value="logs" className="mt-0 p-4">
      <ActivityLog
        logs={(activityLog.data || []) as never[]}
        routingLogs={(routingLogs?.data || []) as never[]}
        isLoading={activityLog.isLoading}
      />
    </TabsContent>

    <TabsContent value="alerts" className="mt-0 p-4">
      <Suspense fallback={<div className="text-xs text-muted-foreground">Memuat alert…</div>}>
        <ChatbotAlertsView />
      </Suspense>
    </TabsContent>

    <TabsContent value="prompt" className="mt-0 p-4">
      <Suspense fallback={<div className="text-xs text-muted-foreground">Memuat prompt studio…</div>}>
        <PromptStudio
          agents={agents}
          onSave={handleSaveConfig}
          isSaving={isSaving}
        />
      </Suspense>
    </TabsContent>

    <TabsContent value="analytics" className="mt-0 p-4">
      <Suspense fallback={<div className="text-xs text-muted-foreground">Memuat analytics…</div>}>
        <AgentAnalytics />
      </Suspense>
    </TabsContent>

    <TabsContent value="escalation" className="mt-0 p-4">
      <Suspense fallback={<div className="text-xs text-muted-foreground">Memuat alur eskalasi…</div>}>
        <EscalationFlow agents={allAgents} />
      </Suspense>
    </TabsContent>

    <TabsContent value="managers" className="mt-0 p-4">
      <Suspense fallback={<div className="text-xs text-muted-foreground">Memuat data manager…</div>}>
        <ManagerNumbersPanel />
      </Suspense>
    </TabsContent>

    <TabsContent value="settings" className="mt-0 p-4">
      <Suspense fallback={<div className="text-xs text-muted-foreground">Memuat pengaturan…</div>}>
        <SettingsPanel />
      </Suspense>
    </TabsContent>
  </>
);

export const DashboardViews = memo(DashboardViewsComponent);
