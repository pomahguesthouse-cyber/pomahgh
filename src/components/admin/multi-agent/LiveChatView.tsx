import { useState } from 'react';
import { Send, UserCheck, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useWhatsAppSessionMessages, useTakeoverSession, useSendAdminMessage, useReleaseSession } from '@/hooks/useWhatsAppSessions';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface LiveChatViewProps {
  sessions: any[];
}

export const LiveChatView = ({ sessions }: LiveChatViewProps) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const selectedSession = sessions?.find(s => s.id === selectedSessionId);
  const { data: messages } = useWhatsAppSessionMessages(selectedSession?.conversation_id);
  const takeover = useTakeoverSession();
  const release = useReleaseSession();
  const sendMessage = useSendAdminMessage();

  const activeSessions = sessions?.filter(s => s.is_active && !s.is_blocked) || [];

  const handleSend = () => {
    if (!message.trim() || !selectedSession) return;
    sendMessage.mutate({
      phoneNumber: selectedSession.phone_number,
      message,
      conversationId: selectedSession.conversation_id,
    });
    setMessage('');
  };

  return (
    <div className="flex h-[500px] border rounded-lg overflow-hidden bg-card">
      {/* Chat list */}
      <div className="w-80 border-r overflow-y-auto">
        <div className="p-3 border-b">
          <h3 className="text-xs font-semibold text-foreground">Percakapan Aktif ({activeSessions.length})</h3>
        </div>
        {activeSessions.map(session => (
          <button
            key={session.id}
            onClick={() => setSelectedSessionId(session.id)}
            className={`w-full text-left p-3 border-b hover:bg-muted/50 transition-colors ${selectedSessionId === session.id ? 'bg-muted' : ''}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground truncate">
                {session.guest_name || session.phone_number}
              </span>
              {session.is_takeover && <Badge variant="destructive" className="text-[9px] px-1">Manual</Badge>}
            </div>
            {session.guest_name && (
              <p className="text-[10px] text-muted-foreground mt-0.5">{session.phone_number}</p>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">
              {session.last_message_at && formatDistanceToNow(new Date(session.last_message_at), { addSuffix: true, locale: idLocale })}
            </p>
            <Badge variant="secondary" className="text-[9px] px-1 mt-1">
              {session.chat_conversations?.message_count || 0} pesan
            </Badge>
          </button>
        ))}
        {activeSessions.length === 0 && (
          <p className="text-xs text-muted-foreground p-4 text-center">Tidak ada chat aktif</p>
        )}
      </div>

      {/* Chat window */}
      <div className="flex-1 flex flex-col">
        {selectedSession ? (
          <>
            <div className="p-3 border-b flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  {selectedSession.guest_name || selectedSession.phone_number}
                </h4>
                {selectedSession.guest_name && (
                  <p className="text-[10px] text-muted-foreground">{selectedSession.phone_number}</p>
                )}
              </div>
              <div className="flex gap-2">
                {selectedSession.is_takeover ? (
                  <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => release.mutate(selectedSession.id)}>
                    <ArrowUpRight className="w-3 h-3" /> Kembalikan ke AI
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => takeover.mutate(selectedSession.id)}>
                    <UserCheck className="w-3 h-3" /> Ambil Alih
                  </Button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages?.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[70%] px-3 py-2 rounded-lg text-xs ${msg.role === 'user' ? 'bg-muted text-foreground' : 'bg-emerald-600 text-white'}`}>
                    {msg.content}
                    <p className={`text-[9px] mt-1 ${msg.role === 'user' ? 'text-muted-foreground' : 'text-emerald-200'}`}>
                      {msg.created_at && new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t flex gap-2">
              <Input
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Ketik pesan..."
                className="text-xs h-8"
              />
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSend}>
                <Send className="w-3 h-3" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
            Pilih percakapan untuk melihat chat
          </div>
        )}
      </div>
    </div>
  );
};
