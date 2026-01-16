import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  useWhatsAppSessions, 
  useWhatsAppSessionMessages, 
  useToggleBlockSession, 
  useDeleteWhatsAppSession,
  useWhatsAppStats,
  useTakeoverSession,
  useReleaseSession,
  useSendAdminMessage,
  WhatsAppSessionWithMessages 
} from '@/hooks/useWhatsAppSessions';
import { supabase } from '@/integrations/supabase/client';
import { Phone, MessageSquare, Ban, Unlock, Trash2, Eye, Search, Users, ShieldCheck, ShieldX, MessageCircle, CalendarCheck, Hand, Bot, Send, Shield } from 'lucide-react';
import { formatDateTimeID } from '@/utils/indonesianFormat';

const StatCard = ({ title, value, icon: Icon, variant = 'default' }: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}) => {
  const variantClasses = {
    default: 'bg-card border',
    success: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
    warning: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
    destructive: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
  };

  return (
    <Card className={variantClasses[variant]}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-background">
            <Icon className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{title}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const SessionMessagesDialog = ({ session }: { session: WhatsAppSessionWithMessages }) => {
  const { data: messages, isLoading } = useWhatsAppSessionMessages(session.conversation_id);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Eye className="w-4 h-4 mr-1" />
          Lihat
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            {session.phone_number}
            <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-800 border-blue-300">
              <Shield className="w-3 h-3 mr-1" />
              Admin
            </Badge>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Memuat pesan...</p>
          ) : messages && messages.length > 0 ? (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-muted rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${
                      msg.role === 'user' ? 'text-white/70' : 'text-muted-foreground'
                    }`}>
                      {msg.created_at ? formatDateTimeID(msg.created_at) : '-'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Tidak ada pesan</p>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

// Admin Chat Dialog with realtime updates
const AdminChatDialog = ({ 
  session, 
  open, 
  onOpenChange 
}: { 
  session: WhatsAppSessionWithMessages; 
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { data: messages, refetch } = useWhatsAppSessionMessages(session.conversation_id);
  const sendMessage = useSendAdminMessage();
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!session.conversation_id || !open) return;

    const channel = supabase
      .channel(`admin-chat-${session.conversation_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${session.conversation_id}`
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session.conversation_id, open, refetch]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    
    await sendMessage.mutateAsync({
      phoneNumber: session.phone_number,
      message: newMessage,
      conversationId: session.conversation_id,
    });
    
    setNewMessage('');
    refetch();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b bg-blue-50 dark:bg-blue-900/20">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <span>Admin Chat: {session.phone_number}</span>
            </div>
            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
              Admin Chatbot
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-3">
            {messages?.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-blue-500 text-white rounded-br-md'
                      : 'bg-muted rounded-bl-md'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${
                    msg.role === 'user' ? 'text-white/70' : 'text-muted-foreground'
                  }`}>
                    {msg.created_at ? formatDateTimeID(msg.created_at) : '-'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t bg-muted/30">
          <div className="flex gap-2">
            <Input
              placeholder="Ketik pesan manual..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              className="flex-1"
            />
            <Button 
              onClick={handleSend} 
              disabled={sendMessage.isPending || !newMessage.trim()}
            >
              <Send className="w-4 h-4 mr-1" />
              Kirim
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const AdminSessionRow = ({ session }: { session: WhatsAppSessionWithMessages }) => {
  const toggleBlock = useToggleBlockSession();
  const deleteSession = useDeleteWhatsAppSession();
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{session.phone_number}</p>
              <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-300">
                Admin
              </Badge>
              {session.is_blocked && (
                <Badge variant="destructive" className="text-xs">Diblokir</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {session.chat_conversations?.message_count || 0} pesan
              </span>
              {session.last_message_at && (
                <span>Terakhir: {formatDateTimeID(session.last_message_at)}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-blue-700 border-blue-300 hover:bg-blue-50"
            onClick={() => setChatOpen(true)}
          >
            <MessageCircle className="w-4 h-4 mr-1" />
            Chat
          </Button>

          <SessionMessagesDialog session={session} />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleBlock.mutate({ id: session.id, isBlocked: !session.is_blocked })}
            disabled={toggleBlock.isPending}
          >
            {session.is_blocked ? (
              <>
                <Unlock className="w-4 h-4 mr-1" />
                Buka
              </>
            ) : (
              <>
                <Ban className="w-4 h-4 mr-1" />
                Blokir
              </>
            )}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus Session?</AlertDialogTitle>
                <AlertDialogDescription>
                  Session WhatsApp admin dari {session.phone_number} akan dihapus permanen beserta riwayat percakapannya.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteSession.mutate(session.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Hapus
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <AdminChatDialog 
        session={session} 
        open={chatOpen} 
        onOpenChange={setChatOpen} 
      />
    </>
  );
};

const AdminWhatsAppSessionsTab = () => {
  const { data: sessions, isLoading } = useWhatsAppSessions('admin');
  const { data: stats } = useWhatsAppStats('admin');
  const [search, setSearch] = useState('');

  const filteredSessions = sessions?.filter(session =>
    session.phone_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          title="Total Admin Sessions" 
          value={stats?.totalSessions || 0} 
          icon={Users} 
        />
        <StatCard 
          title="Aktif" 
          value={stats?.activeSessions || 0} 
          icon={ShieldCheck}
          variant="success"
        />
        <StatCard 
          title="Diblokir" 
          value={stats?.blockedSessions || 0} 
          icon={ShieldX}
          variant="destructive"
        />
        <StatCard 
          title="Total Pesan" 
          value={stats?.totalMessages || 0} 
          icon={MessageCircle}
        />
      </div>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            WhatsApp Admin Sessions
          </CardTitle>
          <CardDescription>
            Percakapan WhatsApp dari manager yang terdaftar (menggunakan Admin Chatbot)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nomor HP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Memuat sessions...</p>
          ) : filteredSessions && filteredSessions.length > 0 ? (
            <div className="space-y-3">
              {filteredSessions.map((session) => (
                <AdminSessionRow key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Belum ada session admin WhatsApp</p>
              <p className="text-xs text-muted-foreground mt-1">
                Manager yang mengirim pesan WhatsApp akan muncul di sini
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminWhatsAppSessionsTab;
