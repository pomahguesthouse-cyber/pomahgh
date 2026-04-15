import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TopBar } from '@/components/admin/chatbot-dashboard/TopBar';
import { AgentFlowDiagram } from '@/components/admin/chatbot-dashboard/AgentFlowDiagram';
import { LiveConversationList } from '@/components/admin/chatbot-dashboard/LiveConversationList';
import { ContextViewer } from '@/components/admin/chatbot-dashboard/ContextViewer';
import { AgentDecisionLog } from '@/components/admin/chatbot-dashboard/AgentDecisionLog';
import { ToolExecutionLog } from '@/components/admin/chatbot-dashboard/ToolExecutionLog';
import { PricingPaymentPanel } from '@/components/admin/chatbot-dashboard/PricingPaymentPanel';
import { AnalyticsSection } from '@/components/admin/chatbot-dashboard/AnalyticsSection';
import { ErrorPanel } from '@/components/admin/chatbot-dashboard/ErrorPanel';
import { Home, UserCog, MessageSquare, BarChart3 } from 'lucide-react';
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

  const managerSessions = sessions?.filter(s => s.session_type === 'admin') || [];
  const guestSessions = sessions || [];

  return (
    <div className="space-y-4 p-2 sm:p-4">
      <TopBar analytics={analytics} />

      <Tabs defaultValue="home" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="home" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Home className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Home</span>
          </TabsTrigger>
          <TabsTrigger value="manager" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <UserCog className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Manager</span>
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">WhatsApp Log</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
        </TabsList>

        {/* HOME TAB */}
        <TabsContent value="home" className="space-y-4">
          <AgentFlowDiagram activeAgent={activeAgent} />
          <LiveConversationList
            sessions={guestSessions}
            selectedSessionId={selectedSession?.id ?? null}
            onSelectSession={setSelectedSession}
            layout="grid"
          />
        </TabsContent>

        {/* MANAGER TAB */}
        <TabsContent value="manager" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <LiveConversationList
              sessions={managerSessions}
              selectedSessionId={selectedSession?.id ?? null}
              onSelectSession={setSelectedSession}
              layout="grid"
            />
            <ContextViewer session={selectedSession} />
          </div>
        </TabsContent>

        {/* WHATSAPP LOG TAB */}
        <TabsContent value="whatsapp" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <LiveConversationList
              sessions={guestSessions}
              selectedSessionId={selectedSession?.id ?? null}
              onSelectSession={setSelectedSession}
              layout="list"
            />
            <div className="space-y-4 lg:col-span-2">
              <ContextViewer session={selectedSession} />
              <AgentDecisionLog messages={messages} />
              <ToolExecutionLog messages={messages} />
              <PricingPaymentPanel session={selectedSession} />
            </div>
          </div>
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-4">
          <AnalyticsSection analytics={analytics} isLoading={analyticsLoading} />
          <ErrorPanel messages={messages} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminChatbotDashboard;
