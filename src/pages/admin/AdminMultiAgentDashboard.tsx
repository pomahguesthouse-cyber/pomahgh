import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TopBar, AgentMetrics, AgentGrid, AgentConfigPanel, LiveChatView, ActivityLog, PromptStudio, EscalationFlow, SettingsPanel, AgentAnalytics, ManagerNumbersPanel, ChatbotAlertsView } from '@/components/admin/multi-agent';
import { useMultiAgentDashboard } from '@/hooks/useMultiAgentDashboard';
import { useChatbotAlerts } from '@/hooks/useChatbotAlerts';
import { Badge } from '@/components/ui/badge';
import type { AgentDefinition } from '@/hooks/useMultiAgentDashboard';

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
    <div className="space-y-0 bg-background min-h-screen">
      <TopBar isConnected={!sessions.isError} />

      <Tabs defaultValue="agents" className="w-full">
        <div className="border-b px-4">
          <TabsList className="bg-transparent h-10 p-0 gap-0 w-full overflow-x-auto overflow-y-hidden whitespace-nowrap">
            <TabsTrigger value="agents" className="shrink-0 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4">
              🤖 Semua Agent
            </TabsTrigger>
            <TabsTrigger value="live-chat" className="shrink-0 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4">
              💬 Live Chat
            </TabsTrigger>
            <TabsTrigger value="logs" className="shrink-0 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4">
              📋 Jadwal & Log
            </TabsTrigger>
            <TabsTrigger value="alerts" className="shrink-0 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 gap-1.5">
              🚨 Alert
              {unresolvedCount > 0 && (
                <Badge variant="destructive" className="h-4 px-1.5 text-[10px] animate-pulse">
                  {unresolvedCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="prompt" className="shrink-0 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4">
              ✏️ Prompt Studio
            </TabsTrigger>
            <TabsTrigger value="analytics" className="shrink-0 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4">
              📊 Analytics
            </TabsTrigger>
            <TabsTrigger value="escalation" className="shrink-0 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4">
              🔀 Alur Eskalasi
            </TabsTrigger>
            <TabsTrigger value="managers" className="shrink-0 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4">
              👨‍💼 Manager
            </TabsTrigger>
            <TabsTrigger value="settings" className="shrink-0 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4">
              ⚙️ Pengaturan
            </TabsTrigger>
          </TabsList>
        </div>

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
                isSaving={saveAgentConfig.isPending}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="live-chat" className="mt-0 p-4">
          <LiveChatView sessions={sessions.data || []} />
        </TabsContent>

        <TabsContent value="logs" className="mt-0 p-4">
          <ActivityLog
            logs={activityLog.data || []}
            routingLogs={routingLogs?.data || []}
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
            isSaving={saveAgentConfig.isPending}
          />
        </TabsContent>

        <TabsContent value="analytics" className="mt-0 p-4">
          <AgentAnalytics />
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
      </Tabs>
    </div>
  );
};

export default AdminMultiAgentDashboard;
