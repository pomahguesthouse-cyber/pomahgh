import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Wrench } from 'lucide-react';
import type { AgentToolLog } from '@/hooks/useAgentDashboard';

interface Props {
  toolLogs: AgentToolLog[];
}

const STATUS_STYLE: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  success: { variant: 'default', label: 'success' },
  pending: { variant: 'secondary', label: 'pending' },
  failed:  { variant: 'destructive', label: 'failed' },
};

export function ToolExecutionLog({ toolLogs }: Props) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex-none">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          Tool Execution Log
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-[350px]">
          {toolLogs.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Belum ada tool execution
            </p>
          ) : (
            <div className="px-4 py-2 space-y-1.5">
              {toolLogs.map((log) => {
                const style = STATUS_STYLE[log.result_status] || STATUS_STYLE.pending;
                const dotColor = log.result_status === 'success' ? 'bg-green-500'
                  : log.result_status === 'failed' ? 'bg-red-500'
                  : 'bg-yellow-500';

                return (
                  <div key={log.id} className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono font-semibold truncate">
                          {log.tool_name}()
                        </code>
                        <span className="text-muted-foreground text-xs">→</span>
                        <Badge variant={style.variant} className="text-[10px] px-1.5 py-0 h-4">
                          {style.label}
                        </Badge>
                        {log.duration_ms && (
                          <span className="text-[10px] text-muted-foreground">{log.duration_ms}ms</span>
                        )}
                      </div>
                      {log.error_message && (
                        <p className="text-[10px] text-red-500 mt-0.5 truncate">{log.error_message}</p>
                      )}
                      {log.result_summary && log.result_status === 'success' && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{log.result_summary}</p>
                      )}
                    </div>
                    {log.agent_name && (
                      <span className="text-[10px] text-muted-foreground flex-shrink-0 capitalize">
                        {log.agent_name}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
