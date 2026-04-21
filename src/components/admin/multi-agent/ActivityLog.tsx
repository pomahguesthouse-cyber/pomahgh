import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ActivityLogItem {
  id: string;
  role: string;
  content: string | null;
  created_at: string | null;
  tool_calls_used: string[] | null;
  is_fallback: boolean | null;
}

interface RoutingLogItem {
  id: string;
  created_at: string | null;
  from_agent: string;
  to_agent: string | null;
  reason: string | null;
  intent: string | null;
  duration_ms: number | null;
}

interface ActivityLogProps {
  logs: ActivityLogItem[];
  routingLogs?: RoutingLogItem[];
  isLoading: boolean;
}

type ViewMode = 'messages' | 'routing';

export const ActivityLog = ({ logs, routingLogs = [], isLoading }: ActivityLogProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('routing');

  const getAgent = (content: string | null, toolCalls: string[] | null) => {
    if (toolCalls?.some(t => t.includes('booking') || t.includes('reservation'))) return 'Reservasi Bot';
    if (toolCalls?.some(t => t.includes('price') || t.includes('pricing'))) return 'Pricing Bot';
    if (toolCalls?.some(t => t.includes('faq') || t.includes('knowledge'))) return 'CS & FAQ Bot';
    if (content?.includes('[Admin]')) return 'Manager Bot';
    if (content?.includes('[System]')) return 'Orchestrator';
    return 'Intent Router';
  };

  const getActivity = (role: string, content: string | null) => {
    if (role === 'user') return 'Pesan masuk dari tamu';
    if (content?.includes('[Admin]')) return 'Balasan admin manual';
    if (content?.includes('[System]')) return 'Transisi sistem';
    return 'Balasan AI otomatis';
  };

  const getStatus = (role: string, isFallback: boolean | null) => {
    if (isFallback) return { label: 'Fallback', variant: 'destructive' as const };
    if (role === 'user') return { label: 'Diterima', variant: 'secondary' as const };
    return { label: 'Terkirim', variant: 'default' as const };
  };

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-xs font-semibold text-foreground">Activity Log Real-time</h3>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm" variant={viewMode === 'routing' ? 'default' : 'outline'}
            className="text-[10px] h-6 px-2"
            onClick={() => setViewMode('routing')}
          >
            🔀 Routing
          </Button>
          <Button
            size="sm" variant={viewMode === 'messages' ? 'default' : 'outline'}
            className="text-[10px] h-6 px-2"
            onClick={() => setViewMode('messages')}
          >
            💬 Pesan
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        {viewMode === 'routing' ? (
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-2 font-medium text-muted-foreground">Waktu</th>
                <th className="text-left p-2 font-medium text-muted-foreground">Dari</th>
                <th className="text-left p-2 font-medium text-muted-foreground">Ke</th>
                <th className="text-left p-2 font-medium text-muted-foreground">Alasan</th>
                <th className="text-left p-2 font-medium text-muted-foreground">Intent</th>
                <th className="text-left p-2 font-medium text-muted-foreground">Durasi</th>
              </tr>
            </thead>
            <tbody>
              {routingLogs.length === 0 ? (
                <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Belum ada routing log hari ini</td></tr>
              ) : (
                routingLogs.slice(0, 30).map((log) => (
                  <tr key={log.id} className="border-b hover:bg-muted/30">
                    <td className="p-2 text-muted-foreground whitespace-nowrap">
                      {log.created_at && new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="p-2 font-medium text-foreground">{log.from_agent}</td>
                    <td className="p-2 text-foreground">
                      {log.to_agent ? (
                        <Badge variant="outline" className="text-[9px]">{log.to_agent}</Badge>
                      ) : '-'}
                    </td>
                    <td className="p-2 text-foreground truncate max-w-[200px]">{log.reason || '-'}</td>
                    <td className="p-2">
                      {log.intent ? <Badge variant="secondary" className="text-[9px]">{log.intent}</Badge> : '-'}
                    </td>
                    <td className="p-2 text-muted-foreground">
                      {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-2 font-medium text-muted-foreground">Waktu</th>
                <th className="text-left p-2 font-medium text-muted-foreground">Agent</th>
                <th className="text-left p-2 font-medium text-muted-foreground">Aktivitas</th>
                <th className="text-left p-2 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Memuat log...</td></tr>
              ) : logs?.length === 0 ? (
                <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Belum ada aktivitas</td></tr>
              ) : (
                logs?.slice(0, 30).map(log => {
                  const status = getStatus(log.role, log.is_fallback);
                  return (
                    <tr key={log.id} className="border-b hover:bg-muted/30">
                      <td className="p-2 text-muted-foreground whitespace-nowrap">
                        {log.created_at && new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="p-2 font-medium text-foreground">{getAgent(log.content, log.tool_calls_used)}</td>
                      <td className="p-2 text-foreground truncate max-w-[300px]">{getActivity(log.role, log.content)}</td>
                      <td className="p-2">
                        <Badge variant={status.variant} className="text-[9px] px-1.5">{status.label}</Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
