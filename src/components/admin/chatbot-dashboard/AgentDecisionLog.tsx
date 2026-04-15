import { GitBranch, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DashboardMessage } from '@/hooks/useChatbotDashboard';

interface AgentDecisionLogProps {
  messages: DashboardMessage[] | undefined;
}

const extractAgentInfo = (content: string) => {
  // Detect agent markers in messages
  if (content.includes('[Admin]')) return { agent: 'Admin Takeover', type: 'admin' };
  if (content.includes('[System]')) return { agent: 'System', type: 'system' };
  if (content.toLowerCase().includes('booking') || content.toLowerCase().includes('reservasi')) return { agent: 'Booking Agent', type: 'booking' };
  if (content.toLowerCase().includes('harga') || content.toLowerCase().includes('price')) return { agent: 'Pricing Agent', type: 'pricing' };
  if (content.toLowerCase().includes('bayar') || content.toLowerCase().includes('payment')) return { agent: 'Payment Agent', type: 'payment' };
  return { agent: 'FAQ Agent', type: 'faq' };
};

const typeColors: Record<string, string> = {
  booking: 'bg-green-500/10 text-green-700',
  faq: 'bg-amber-500/10 text-amber-700',
  pricing: 'bg-purple-500/10 text-purple-700',
  payment: 'bg-pink-500/10 text-pink-700',
  admin: 'bg-orange-500/10 text-orange-700',
  system: 'bg-muted text-muted-foreground',
};

const formatTime = (dateStr: string | null) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const wib = new Date(utc + 7 * 3600000);
  return wib.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export const AgentDecisionLog = ({ messages }: AgentDecisionLogProps) => {
  const assistantMsgs = messages?.filter(m => m.role === 'assistant').slice(-20) || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-primary" />
          Agent Decision Log
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          {assistantMsgs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Belum ada keputusan agent</p>
          )}
          <div className="divide-y">
            {assistantMsgs.map((msg) => {
              const info = extractAgentInfo(msg.content);
              return (
                <div key={msg.id} className="px-4 py-2.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className={`text-[10px] ${typeColors[info.type] || ''}`}>
                      {info.agent}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{msg.content.slice(0, 120)}</p>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
