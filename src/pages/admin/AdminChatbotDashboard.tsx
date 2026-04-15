import { useState } from 'react';
import { TopBar } from '@/components/admin/chatbot-dashboard/TopBar';
import { AgentFlowDiagram } from '@/components/admin/chatbot-dashboard/AgentFlowDiagram';
import { LiveConversationList } from '@/components/admin/chatbot-dashboard/LiveConversationList';
import { ContextViewer } from '@/components/admin/chatbot-dashboard/ContextViewer';
import { AgentDecisionLog } from '@/components/admin/chatbot-dashboard/AgentDecisionLog';
import { ToolExecutionLog } from '@/components/admin/chatbot-dashboard/ToolExecutionLog';
import { PricingPaymentPanel } from '@/components/admin/chatbot-dashboard/PricingPaymentPanel';
import { AnalyticsSection } from '@/components/admin/chatbot-dashboard/AnalyticsSection';
import { ErrorPanel } from '@/components/admin/chatbot-dashboard/ErrorPanel';
import {
  useDashboardSessions,
  useDashboardMessages,
  useDashboardAnalytics,
  DashboardSession,
} from '@/hooks/useChatbotDashboard';

const AdminChatbotDashboard = () => {
  const [selectedSession, setSelectedSession] = useState<DashboardSession | null>(null);
  const { data: sessions } = useDashboardSessions();
  const { data: messages } = useDashboardMessages(selectedSession?.conversation_id ?? null);
  const { data: analytics, isLoading: analyticsLoading } = useDashboardAnalytics();

  const activeAgent = selectedSession?.context
    ? ((selectedSession.context as Record<string, unknown>).last_agent as string) || null
    : null;

  return (
    <div className="space-y-4 p-2 sm:p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">AI Dashboard</h1>
      </div>

      <TopBar analytics={analytics} />
      <AnalyticsSection analytics={analytics} isLoading={analyticsLoading} />
      <ErrorPanel messages={messages} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Column 1: Live Conversations */}
        <div className="space-y-4">
          <LiveConversationList
            sessions={sessions}
            selectedSessionId={selectedSession?.id ?? null}
            onSelectSession={setSelectedSession}
          />
        </div>

        {/* Column 2: Agent Flow + Context */}
        <div className="space-y-4">
          <AgentFlowDiagram activeAgent={activeAgent} />
          <ContextViewer session={selectedSession} />
        </div>

        {/* Column 3: Logs + Pricing */}
        <div className="space-y-4">
          <AgentDecisionLog messages={messages} />
          <ToolExecutionLog messages={messages} />
          <PricingPaymentPanel session={selectedSession} />
        </div>
      </div>
    </div>
  );
};

export default AdminChatbotDashboard;
