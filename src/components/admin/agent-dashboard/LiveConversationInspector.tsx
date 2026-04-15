import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, ArrowLeft, User, Bot } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import type { ActiveConversation, ConversationDetail } from '@/hooks/useAgentDashboard';
import { cn } from '@/lib/utils';

interface Props {
  conversations: ActiveConversation[];
  selectedConvId: string | null;
  selectedDetail: ConversationDetail | null;
  onSelectConversation: (id: string) => void;
}

export function LiveConversationInspector({
  conversations,
  selectedConvId,
  selectedDetail,
  onSelectConversation,
}: Props) {
  const [showDetail, setShowDetail] = useState(false);

  const handleSelect = (id: string) => {
    onSelectConversation(id);
    setShowDetail(true);
  };

  const getDisplayName = (conv: ActiveConversation) => {
    if (conv.guest_name) return conv.guest_name;
    if (conv.session_id?.startsWith('wa_')) {
      const phone = conv.session_id.replace('wa_', '').split('_')[0];
      return phone.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3');
    }
    return `Chat #${conv.id.slice(0, 6)}`;
  };

  const timeAgo = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: localeId });
    } catch {
      return '';
    }
  };

  // Detail view
  if (showDetail && selectedDetail) {
    const conv = conversations.find(c => c.id === selectedConvId);
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2 flex-none">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowDetail(false)} className="p-1 hover:bg-accent rounded">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <CardTitle className="text-sm font-medium">
              {conv ? getDisplayName(conv) : 'Percakapan'}
            </CardTitle>
            {conv?.booking_created && <Badge variant="default" className="text-[10px] bg-green-600">BOOKING</Badge>}
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-[400px] px-4 py-2">
            <div className="space-y-3">
              {selectedDetail.messages.map((msg) => {
                const isUser = msg.role === 'user';
                // Check if there's an agent decision around this message time
                const relatedDecision = selectedDetail.decisions.find(d => {
                  const dTime = new Date(d.created_at).getTime();
                  const mTime = new Date(msg.created_at).getTime();
                  return Math.abs(dTime - mTime) < 3000;
                });

                return (
                  <div key={msg.id}>
                    {relatedDecision && (
                      <div className="flex justify-center my-1">
                        <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          [{relatedDecision.from_agent}] → {relatedDecision.to_agent}
                          {relatedDecision.intent && ` | Intent: ${relatedDecision.intent}`}
                        </span>
                      </div>
                    )}
                    <div className={cn('flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
                      {!isUser && <Bot className="h-5 w-5 text-amber-600 mt-1 flex-shrink-0" />}
                      <div className={cn(
                        'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                        isUser
                          ? 'bg-green-100 text-green-900'
                          : 'bg-white border text-gray-800'
                      )}>
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <p className={cn('text-[10px] mt-1', isUser ? 'text-green-600' : 'text-muted-foreground')}>
                          {new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {isUser && <User className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />}
                    </div>
                  </div>
                );
              })}
              {selectedDetail.messages.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">Belum ada pesan</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  // List view
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex-none">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Live Conversations
          <Badge variant="outline" className="text-[10px]">{conversations.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-[400px]">
          {conversations.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Belum ada percakapan hari ini</p>
          ) : (
            <div className="divide-y">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelect(conv.id)}
                  className={cn(
                    'w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors',
                    selectedConvId === conv.id && 'bg-accent'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{getDisplayName(conv)}</span>
                        {conv.booking_created && (
                          <Badge variant="default" className="text-[10px] bg-green-600 flex-shrink-0">BOOKING</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {conv.message_count} pesan
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                      {timeAgo(conv.started_at)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
