import { Badge } from '@/components/ui/badge';

interface ActivityLogProps {
  logs: any[];
  isLoading: boolean;
}

export const ActivityLog = ({ logs, isLoading }: ActivityLogProps) => {
  const getAgent = (content: string, toolCalls: string[] | null) => {
    if (toolCalls?.some(t => t.includes('booking') || t.includes('reservation'))) return 'Reservasi Bot';
    if (toolCalls?.some(t => t.includes('price') || t.includes('pricing'))) return 'Pricing Bot';
    if (toolCalls?.some(t => t.includes('faq') || t.includes('knowledge'))) return 'CS & FAQ Bot';
    if (content?.includes('[Admin]')) return 'Manager Bot';
    if (content?.includes('[System]')) return 'Orchestrator';
    return 'Intent Router';
  };

  const getActivity = (role: string, content: string) => {
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
      <div className="p-3 border-b flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <h3 className="text-xs font-semibold text-foreground">Activity Log Real-time</h3>
      </div>
      <div className="overflow-x-auto">
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
      </div>
    </div>
  );
};
