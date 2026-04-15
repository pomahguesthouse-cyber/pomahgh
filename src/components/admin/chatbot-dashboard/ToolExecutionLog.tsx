import { Wrench, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DashboardMessage } from '@/hooks/useChatbotDashboard';

interface ToolExecutionLogProps {
  messages: DashboardMessage[] | undefined;
}

const statusIcon = (status: 'success' | 'pending' | 'failed') => {
  switch (status) {
    case 'success': return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
    case 'failed': return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
    default: return <Clock className="h-3.5 w-3.5 text-amber-500" />;
  }
};

const formatTime = (dateStr: string | null) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const wib = new Date(utc + 7 * 3600000);
  return wib.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export const ToolExecutionLog = ({ messages }: ToolExecutionLogProps) => {
  // Extract messages that have tool_calls_used
  const toolMessages = messages?.filter(m => m.tool_calls_used && m.tool_calls_used.length > 0) || [];

  const toolEntries = toolMessages.flatMap(msg =>
    (msg.tool_calls_used || []).map(tool => ({
      id: `${msg.id}-${tool}`,
      tool,
      time: msg.created_at,
      status: 'success' as const, // If logged, it completed
    }))
  ).slice(-20);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Wrench className="h-5 w-5 text-primary" />
          Tool Execution
          {toolEntries.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">{toolEntries.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          {toolEntries.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Belum ada tool calls</p>
          )}
          <div className="divide-y">
            {toolEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2">
                  {statusIcon(entry.status)}
                  <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{entry.tool}()</code>
                </div>
                <span className="text-[10px] text-muted-foreground">{formatTime(entry.time)}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
