import { Phone, Clock, MessageCircle, Shield, Ban, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DashboardSession } from '@/hooks/useChatbotDashboard';
import { cn } from '@/lib/utils';

interface LiveConversationListProps {
  sessions: DashboardSession[] | undefined;
  selectedSessionId: string | null;
  onSelectSession: (session: DashboardSession) => void;
  layout?: 'grid' | 'list';
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

const getGuestName = (session: DashboardSession): string | null => {
  if (session.guest_name) return session.guest_name;
  const ctx = session.context as Record<string, unknown> | null;
  if (ctx?.guest_name) return ctx.guest_name as string;
  if (ctx?.name) return ctx.name as string;
  return null;
};

export const LiveConversationList = ({ sessions, selectedSessionId, onSelectSession, layout = 'list' }: LiveConversationListProps) => {
  const isGrid = layout === 'grid';

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
      <CardContent className={isGrid ? 'p-4 pt-0' : 'p-0'}>
        {(!sessions || sessions.length === 0) && (
          <div className="p-6 text-center text-sm text-muted-foreground">Belum ada percakapan aktif</div>
        )}

        {isGrid ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sessions?.map((s) => {
              const intent = getIntentFromContext(s.context);
              const isSelected = s.id === selectedSessionId;
              const guestName = getGuestName(s);
              return (
                <button
                  key={s.id}
                  onClick={() => onSelectSession(s)}
                  className={cn(
                    'text-left rounded-lg border p-3 transition-all hover:shadow-md',
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border bg-card hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="rounded-full bg-muted p-1.5 shrink-0">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        {guestName ? (
                          <>
                            <p className="text-sm font-semibold truncate">{guestName}</p>
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                              <Phone className="h-3 w-3 shrink-0" />
                              {s.phone_number}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm font-medium truncate flex items-center gap-1">
                            <Phone className="h-3 w-3 shrink-0 text-muted-foreground" />
                            {s.phone_number}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {s.is_takeover && <Shield className="h-3.5 w-3.5 text-orange-500" />}
                      {s.is_blocked && <Ban className="h-3.5 w-3.5 text-destructive" />}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className={cn('text-[10px]', intentColors[intent] || intentColors.unknown)}>
                      {intent.toUpperCase()}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(s.last_message_at)} WIB
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="divide-y">
              {sessions?.map((s) => {
                const intent = getIntentFromContext(s.context);
                const isSelected = s.id === selectedSessionId;
                const guestName = getGuestName(s);
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
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          {guestName ? (
                            <>
                              <span className="text-sm font-semibold truncate block">{guestName}</span>
                              <span className="text-xs text-muted-foreground truncate block">{s.phone_number}</span>
                            </>
                          ) : (
                            <span className="text-sm font-medium truncate block">{s.phone_number}</span>
                          )}
                        </div>
                        {s.is_takeover && <Shield className="h-3.5 w-3.5 text-orange-500 shrink-0" />}
                        {s.is_blocked && <Ban className="h-3.5 w-3.5 text-destructive shrink-0" />}
                      </div>
                      <Badge variant="outline" className={cn('text-[10px] shrink-0', intentColors[intent] || intentColors.unknown)}>
                        {intent.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatTime(s.last_message_at)} WIB</span>
                      {s.session_type === 'admin' && (
                        <Badge variant="outline" className="ml-2 text-[10px] bg-orange-500/10 text-orange-600">Manager</Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
