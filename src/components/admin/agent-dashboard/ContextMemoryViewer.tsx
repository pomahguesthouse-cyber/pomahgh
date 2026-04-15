import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';
import type { ConversationDetail } from '@/hooks/useAgentDashboard';

interface Props {
  detail: ConversationDetail | null;
}

export function ContextMemoryViewer({ detail }: Props) {
  if (!detail) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Context & Memory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Pilih percakapan untuk melihat konteks
          </p>
        </CardContent>
      </Card>
    );
  }

  const ctx = detail.context;
  const hasContext = Object.keys(ctx).length > 0;

  // Extract meaningful fields
  const contextFields = hasContext ? [
    ctx.intent && { label: 'Intent', value: String(ctx.intent) },
    ctx.guest_name && { label: 'Guest', value: String(ctx.guest_name) },
    ctx.phone_number && { label: 'Phone', value: String(ctx.phone_number) },
    ctx.session_type && { label: 'Type', value: String(ctx.session_type) },
    ctx.is_active !== undefined && { label: 'Active', value: ctx.is_active ? 'Ya' : 'Tidak' },
    ctx.is_takeover !== undefined && { label: 'Takeover', value: ctx.is_takeover ? 'Ya' : 'Tidak' },
    ctx.awaiting_name !== undefined && { label: 'Awaiting Name', value: ctx.awaiting_name ? 'Ya' : 'Tidak' },
    ctx.last_message_at && { label: 'Last Message', value: new Date(String(ctx.last_message_at)).toLocaleTimeString('id-ID') },
  ].filter(Boolean) as Array<{label: string; value: string}> : [];

  // Extract latest decision context
  const lastDecision = detail.decisions[detail.decisions.length - 1];
  const lastIntent = lastDecision?.intent;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex-none">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Context & Memory
          </CardTitle>
          {lastIntent && (
            <Badge variant="default" className="text-[11px] bg-amber-600 uppercase">
              {lastIntent}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-[300px] px-4 py-2">
          {contextFields.length > 0 ? (
            <div className="space-y-2">
              {contextFields.map((field) => (
                <div key={field.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{field.label}:</span>
                  <span className="font-mono text-xs">{field.value}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-3">
                <p className="text-xs text-muted-foreground mb-1">Raw Context</p>
                <pre className="text-[11px] font-mono bg-muted/50 rounded p-2 whitespace-pre-wrap break-all overflow-hidden">
                  {JSON.stringify(ctx, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {detail.decisions.length > 0 ? 'Konteks dari agent decisions:' : 'Tidak ada session context (web chat)'}
              </p>
              {detail.decisions.length > 0 && (
                <div className="space-y-1">
                  {detail.decisions.slice(-5).map((d) => (
                    <div key={d.id} className="text-xs font-mono bg-muted/50 rounded p-1.5">
                      <span className="text-amber-600">{d.from_agent}</span>
                      {d.to_agent && <span> → <span className="text-blue-600">{d.to_agent}</span></span>}
                      {d.intent && <span className="text-muted-foreground"> | {d.intent}</span>}
                      {d.confidence && <span className="text-green-600"> ({Math.round(d.confidence * 100)}%)</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
