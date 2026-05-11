import { useState, useMemo, useEffect, useRef } from 'react';
import { Send, UserCheck, ArrowUpRight, Users, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useWhatsAppSessionMessages, useTakeoverSession, useSendAdminMessage, useReleaseSession } from '@/hooks/useWhatsAppSessions';
import { useHotelSettings, type WhatsAppManager } from '@/hooks/useHotelSettings';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { ConversationMemoryViewer } from './ConversationMemoryViewer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface SessionConversationSummary {
  id: string;
  message_count: number | null;
  booking_created: boolean | null;
  started_at: string | null;
  ended_at: string | null;
}

interface LiveChatSession {
  id: string;
  phone_number: string;
  guest_name: string | null;
  conversation_id: string | null;
  last_message_at: string | null;
  is_active: boolean | null;
  is_blocked: boolean | null;
  is_takeover: boolean | null;
  session_type?: string | null;
  awaiting_name?: boolean | null;
  chat_conversations?: SessionConversationSummary | null;
}

interface ChatMessageItem {
  id: string;
  role: string;
  content: string | null;
  created_at: string | null;
}

interface LiveChatViewProps {
  sessions: LiveChatSession[];
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
  const [unreadByConv, setUnreadByConv] = useState<Record<string, number>>({});
  const queryClient = useQueryClient();
  const mountedAtRef = useRef<number>(Date.now());

  const { settings: hotelSettings } = useHotelSettings();
  const managerNumbers = hotelSettings?.whatsapp_manager_numbers;

  // Build phone -> manager name lookup
  const managerMap = useMemo(() => {
    const map = new Map<string, { name: string; role?: string }>();
    managerNumbers?.forEach((m: WhatsAppManager) => {
      const norm = normalizePhone(m.phone);
      if (norm) map.set(norm, { name: m.name, role: m.role });
    });
    return map;
  }, [managerNumbers]);

  const isManagerSession = (session: LiveChatSession): boolean => {
    if (session.session_type === 'admin') return true;
    return managerMap.has(normalizePhone(session.phone_number));
  };

  const getDisplayName = (session: LiveChatSession): string => {
    const norm = normalizePhone(session.phone_number);
    const manager = managerMap.get(norm);
    if (manager) return manager.name;
    return session.guest_name || session.phone_number;
  };

  const getManagerRole = (session: LiveChatSession): string | undefined => {
    const norm = normalizePhone(session.phone_number);
    return managerMap.get(norm)?.role;
  };

  const selectedSession = sessions?.find(s => s.id === selectedSessionId);
  const selectedConvId = selectedSession?.conversation_id ?? null;

  // Clear unread on session select
  useEffect(() => {
    if (selectedConvId) {
      setUnreadByConv(prev => {
        if (!prev[selectedConvId]) return prev;
        const next = { ...prev };
        delete next[selectedConvId];
        return next;
      });
    }
  }, [selectedConvId]);

  // Build conv -> session lookup for notifications
  const convToSession = useMemo(() => {
    const map = new Map<string, LiveChatSession>();
    sessions?.forEach(s => {
      if (s.conversation_id) map.set(s.conversation_id, s);
    });
    return map;
  }, [sessions]);

  // Realtime: notify on new guest messages
  useEffect(() => {
    const channel = supabase
      .channel('live-chat-new-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: 'role=eq.user' },
        (payload) => {
          const msg = payload.new as { conversation_id: string; created_at: string; content: string | null };
          if (!msg.conversation_id) return;
          // Ignore messages created before this view mounted (avoid backlog spam)
          if (msg.created_at && new Date(msg.created_at).getTime() < mountedAtRef.current - 5000) return;
          // Don't notify for currently open conversation
          if (msg.conversation_id === selectedConvId) return;

          const session = convToSession.get(msg.conversation_id);
          // Only notify for guest sessions (skip managers)
          if (session && isManagerSession(session)) return;

          const name = session ? getDisplayName(session) : 'Tamu baru';
          const preview = (msg.content || '').slice(0, 80);

          setUnreadByConv(prev => ({
            ...prev,
            [msg.conversation_id]: (prev[msg.conversation_id] || 0) + 1,
          }));

          toast(`Pesan baru dari ${name}`, {
            description: preview || 'Pesan baru masuk',
            action: session
              ? { label: 'Buka', onClick: () => setSelectedSessionId(session.id) }
              : undefined,
          });

          // Refresh sessions list so last_message_at updates
          queryClient.invalidateQueries({ queryKey: ['whatsapp-sessions'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConvId, convToSession]);

  const { data: messages } = useWhatsAppSessionMessages(selectedSession?.conversation_id ?? null) as {
    data: ChatMessageItem[] | undefined;
  };
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
      sessionId: selectedSession.id,
    });
    setMessage('');
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'guest' | 'manager');
    setSelectedSessionId(null);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-11rem)] lg:h-[calc(100vh-13rem)] min-h-[620px] border rounded-lg overflow-hidden bg-card">
      {/* Chat list */}
      <div className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r overflow-y-auto shrink-0 flex flex-col max-h-64 lg:max-h-none">
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
              const unread = session.conversation_id ? unreadByConv[session.conversation_id] || 0 : 0;
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
                    <div className="flex items-center gap-1 shrink-0">
                      {unread > 0 && (
                        <Badge className="text-[9px] px-1 bg-destructive text-destructive-foreground animate-pulse">
                          {unread} baru
                        </Badge>
                      )}
                      {session.is_takeover && <Badge variant="destructive" className="text-[9px] px-1">Manual</Badge>}
                    </div>
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
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs gap-1"
                    onClick={() => release.mutate(selectedSession.id)}
                    disabled={release.isPending}
                  >
                    <ArrowUpRight className="w-3 h-3" />
                    {release.isPending ? 'Mengembalikan…' : 'Kembalikan ke AI'}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs gap-1"
                    onClick={() => takeover.mutate(selectedSession.id)}
                    disabled={takeover.isPending}
                  >
                    <UserCheck className="w-3 h-3" />
                    {takeover.isPending ? 'Mengambil…' : 'Ambil Alih'}
                  </Button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages?.map(msg => {
                const content = msg.content ?? '';
                const isSystem = content.startsWith('[System]');
                const isAdmin = content.startsWith('[Admin]');
                const isUser = msg.role === 'user';
                const stripped = isSystem
                  ? content.replace('[System] ', '')
                  : isAdmin
                  ? content.replace('[Admin] ', '')
                  : content;
                const time = msg.created_at
                  ? new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                  : '';

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <div className="max-w-[80%] px-3 py-1.5 rounded-full text-[10px] italic text-muted-foreground bg-muted/50 border border-dashed">
                        {stripped} {time && <span className="ml-1 opacity-60">• {time}</span>}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
                    <div
                      className={`max-w-[70%] px-3 py-2 rounded-lg text-xs ${
                        isUser
                          ? 'bg-muted text-foreground'
                          : isAdmin
                          ? 'bg-emerald-600 text-white'
                          : 'bg-primary text-primary-foreground'
                      }`}
                    >
                      {isAdmin && (
                        <p className="text-[9px] font-semibold uppercase tracking-wider mb-0.5 opacity-90">
                          Admin
                        </p>
                      )}
                      <p className="whitespace-pre-wrap break-words">{stripped}</p>
                      <p className={`text-[9px] mt-1 ${isUser ? 'text-muted-foreground' : 'opacity-70'}`}>
                        {time}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-3 border-t flex gap-2">
              <Input
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Ketik pesan..."
                className="text-xs h-8"
                disabled={sendMessage.isPending}
              />
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90"
                onClick={handleSend}
                disabled={sendMessage.isPending || !message.trim()}
              >
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
        <div className="hidden xl:block">
        <ConversationMemoryViewer session={selectedSession} />
        </div>
      )}
    </div>
  );
};
