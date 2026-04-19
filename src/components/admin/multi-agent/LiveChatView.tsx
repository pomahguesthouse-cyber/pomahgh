import { useState, useMemo } from 'react';
import { Send, UserCheck, ArrowUpRight, Users, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useWhatsAppSessionMessages, useTakeoverSession, useSendAdminMessage, useReleaseSession } from '@/hooks/useWhatsAppSessions';
import { useHotelSettings } from '@/hooks/useHotelSettings';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { ConversationMemoryViewer } from './ConversationMemoryViewer';

interface LiveChatViewProps {
  sessions: any[];
}

const normalizePhone = (phone: string | null | undefined): string => {
  if (!phone) return '';
  let n = phone.replace(/\D/g, '');
  if (n.startsWith('0')) n = '62' + n.slice(1);
  if (n.startsWith('8')) n = '62' + n;
  return n;
};

export const LiveChatView = ({ sessions }: LiveChatViewProps) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'guest' | 'manager'>('guest');

  const { settings: hotelSettings } = useHotelSettings();
  const managerNumbers = hotelSettings?.whatsapp_manager_numbers || [];

  // Build phone -> manager name lookup
  const managerMap = useMemo(() => {
    const map = new Map<string, { name: string; role?: string }>();
    managerNumbers.forEach((m: any) => {
      const norm = normalizePhone(m.phone);
      if (norm) map.set(norm, { name: m.name, role: m.role });
    });
    return map;
  }, [managerNumbers]);

  const isManagerSession = (session: any): boolean => {
    if (session.session_type === 'admin') return true;
    return managerMap.has(normalizePhone(session.phone_number));
  };

  const getDisplayName = (session: any): string => {
    const norm = normalizePhone(session.phone_number);
    const manager = managerMap.get(norm);
    if (manager) return manager.name;
    return session.guest_name || session.phone_number;
  };

  const getManagerRole = (session: any): string | undefined => {
    const norm = normalizePhone(session.phone_number);
    return managerMap.get(norm)?.role;
  };

  const selectedSession = sessions?.find(s => s.id === selectedSessionId);
  const { data: messages } = useWhatsAppSessionMessages(selectedSession?.conversation_id);
  const takeover = useTakeoverSession();
  const release = useReleaseSession();
  const sendMessage = useSendAdminMessage();

  const allActive = sessions?.filter(s => s.is_active && !s.is_blocked) || [];
  const managerSessions = allActive.filter(isManagerSession);
  const guestSessions = allActive.filter(s => !isManagerSession(s));

  const visibleSessions = activeTab === 'manager' ? managerSessions : guestSessions;

  const handleSend = () => {
    if (!message.trim() || !selectedSession) return;
    sendMessage.mutate({
      phoneNumber: selectedSession.phone_number,
      message,
      conversationId: selectedSession.conversation_id,
    });
    setMessage('');
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'guest' | 'manager');
    setSelectedSessionId(null);
  };

  return (
    <div className="flex h-[500px] border rounded-lg overflow-hidden bg-card">
      {/* Chat list */}
      <div className="w-72 border-r overflow-y-auto shrink-0 flex flex-col">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col h-full">
          <TabsList className="grid grid-cols-2 m-2 h-8">
            <TabsTrigger value="guest" className="text-xs gap-1">
              <Users className="w-3 h-3" /> Tamu ({guestSessions.length})
            </TabsTrigger>
            <TabsTrigger value="manager" className="text-xs gap-1">
              <Briefcase className="w-3 h-3" /> Manager ({managerSessions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="flex-1 overflow-y-auto mt-0">
            {visibleSessions.map(session => {
              const displayName = getDisplayName(session);
              const role = getManagerRole(session);
              return (
                <button
                  key={session.id}
                  onClick={() => setSelectedSessionId(session.id)}
                  className={`w-full text-left p-3 border-b hover:bg-muted/50 transition-colors ${selectedSessionId === session.id ? 'bg-muted' : ''}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-medium text-foreground truncate">
                      {displayName}
                    </span>
                    {session.is_takeover && <Badge variant="destructive" className="text-[9px] px-1 shrink-0">Manual</Badge>}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{session.phone_number}</p>
                  {role && (
                    <Badge variant="outline" className="text-[9px] px-1 mt-1 mr-1">{role}</Badge>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {session.last_message_at && formatDistanceToNow(new Date(session.last_message_at), { addSuffix: true, locale: idLocale })}
                  </p>
                  <Badge variant="secondary" className="text-[9px] px-1 mt-1">
                    {session.chat_conversations?.message_count || 0} pesan
                  </Badge>
                </button>
              );
            })}
            {visibleSessions.length === 0 && (
              <p className="text-xs text-muted-foreground p-4 text-center">
                {activeTab === 'manager' ? 'Tidak ada chat manager aktif' : 'Tidak ada chat tamu aktif'}
              </p>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Chat window */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedSession ? (
          <>
            <div className="p-3 border-b flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  {getDisplayName(selectedSession)}
                </h4>
                <p className="text-[10px] text-muted-foreground">{selectedSession.phone_number}</p>
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
                  <div className={`max-w-[70%] px-3 py-2 rounded-lg text-xs ${msg.role === 'user' ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground'}`}>
                    {msg.content}
                    <p className={`text-[9px] mt-1 ${msg.role === 'user' ? 'text-muted-foreground' : 'opacity-70'}`}>
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
              <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={handleSend}>
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

      {/* Memory Sidebar */}
      {selectedSession && (
        <ConversationMemoryViewer session={selectedSession} />
      )}
    </div>
  );
};
