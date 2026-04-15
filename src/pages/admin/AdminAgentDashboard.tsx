import { useAgentDashboard } from '@/hooks/useAgentDashboard';
import { AgentAnalyticsCards } from '@/components/admin/agent-dashboard/AgentAnalyticsCards';
import { LiveConversationInspector } from '@/components/admin/agent-dashboard/LiveConversationInspector';
import { ContextMemoryViewer } from '@/components/admin/agent-dashboard/ContextMemoryViewer';
import { AgentDecisionLog } from '@/components/admin/agent-dashboard/AgentDecisionLog';
import { ToolExecutionLog } from '@/components/admin/agent-dashboard/ToolExecutionLog';
import { AgentOrchestrationFlow } from '@/components/admin/agent-dashboard/AgentOrchestrationFlow';
import { AgentErrorPanel } from '@/components/admin/agent-dashboard/AgentErrorPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Trash2, RotateCcw } from 'lucide-react';
import { getWIBNow } from '@/utils/wibTimezone';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  active:   { label: 'AI ACTIVE', color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-50' },
  degraded: { label: 'DEGRADED', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50' },
  down:     { label: 'AI DOWN', color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50' },
};

export default function AdminAgentDashboard() {
  const {
    decisions,
    toolLogs,
    conversations,
    analytics,
    systemStatus,
    selectedConvId,
    selectedDetail,
    errors,
    isLoading,
    selectConversation,
    dismissError,
    refresh,
  } = useAgentDashboard();

  const now = getWIBNow();
  const statusCfg = STATUS_CONFIG[systemStatus];

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* ─── Header Bar ─── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Multi-Agent Dashboard</h1>
          <Badge variant="outline" className={cn('gap-1.5 px-2.5 py-1', statusCfg.bgColor, statusCfg.textColor)}>
            <span className={cn('w-2 h-2 rounded-full animate-pulse', statusCfg.color)} />
            {statusCfg.label}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>👥 {analytics.activeUsers} active</span>
          <span>🕐 {format(now, 'HH:mm:ss', { locale: localeId })} WIB</span>
          <Button variant="outline" size="sm" onClick={refresh} className="gap-1.5 h-8">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* ─── Section G: Analytics Cards ─── */}
      <AgentAnalyticsCards analytics={analytics} />

      {/* ─── Main Grid: 3 columns ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column: Conversation Inspector */}
        <div className="lg:col-span-1">
          <LiveConversationInspector
            conversations={conversations}
            selectedConvId={selectedConvId}
            selectedDetail={selectedDetail}
            onSelectConversation={selectConversation}
          />
        </div>

        {/* Center column: Orchestration + Decision Log */}
        <div className="lg:col-span-1 space-y-4">
          <AgentOrchestrationFlow
            decisions={decisions}
            selectedConvId={selectedConvId}
          />
          <AgentDecisionLog decisions={decisions} />
        </div>

        {/* Right column: Context + Tool Log */}
        <div className="lg:col-span-1 space-y-4">
          <ContextMemoryViewer detail={selectedDetail} />
          <ToolExecutionLog toolLogs={toolLogs} />
        </div>
      </div>

      {/* ─── Error Panel (floating) ─── */}
      <AgentErrorPanel errors={errors} onDismiss={dismissError} />
    </div>
  );
}
