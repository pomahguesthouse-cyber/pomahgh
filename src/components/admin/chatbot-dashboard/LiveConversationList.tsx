import { Phone, Clock, MessageCircle, Shield, Ban } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DashboardSession } from '@/hooks/useChatbotDashboard';
import { cn } from '@/lib/utils';

interface LiveConversationListProps {
  sessions: DashboardSession[] | undefined;
  selectedSessionId: string | null;
  onSelectSession: (session: DashboardSession) => void;
}

const formatTime = (dateStr: string | null) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const wib = new Date(utc + 7 * 3600000);
  return wib.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

const getIntentFromContext = (ctx: Record<string, unknown> | null): string => {
  if (!ctx) return 'unknown';
  return (ctx.intent as string) || (ctx.last_agent as string) || 'unknown';
};

const intentColors: Record<string, string> = {
  booking: 'bg-green-500/10 text-green-700 border-green-500/20',
  faq: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  pricing: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
  payment: 'bg-pink-500/10 text-pink-700 border-pink-500/20',
  manager: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
  unknown: 'bg-muted text-muted-foreground',
};

export const LiveConversationList = ({ sessions, selectedSessionId, onSelectSession }: LiveConversationListProps) => {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          Live Conversations
          {sessions && (
            <Badge variant="secondary" className="ml-auto text-xs">{sessions.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="divide-y">
            {(!sessions || sessions.length === 0) && (
              <div className="p-6 text-center text-sm text-muted-foreground">Belum ada percakapan aktif</div>
            )}
            {sessions?.map((s) => {
              const intent = getIntentFromContext(s.context);
              const isSelected = s.id === selectedSessionId;
              return (
                <button
                  key={s.id}
                  onClick={() => onSelectSession(s)}
                  className={cn(
                    'w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors',
                    isSelected && 'bg-primary/5 border-l-2 border-l-primary'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">
                        {s.guest_name || s.phone_number}
                      </span>
                      {s.is_takeover && <Shield className="h-3.5 w-3.5 text-orange-500 shrink-0" />}
                      {s.is_blocked && <Ban className="h-3.5 w-3.5 text-destructive shrink-0" />}
                    </div>
                    <Badge variant="outline" className={cn('text-[10px] shrink-0', intentColors[intent] || intentColors.unknown)}>
                      {intent.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(s.last_message_at)}</span>
                    <span className="ml-1">WIB</span>
                    {s.session_type === 'admin' && (
                      <Badge variant="outline" className="ml-2 text-[10px] bg-orange-500/10 text-orange-600">Manager</Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
