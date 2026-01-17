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
import { Phone, MessageSquare, Ban, Unlock, Trash2, Eye, Search, Users, ShieldCheck, ShieldX, MessageCircle, CalendarCheck, Hand, Bot, Send, Settings } from 'lucide-react';
import { useHotelSettings } from '@/hooks/useHotelSettings';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
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
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${
                      msg.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
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

// Takeover Chat Dialog with realtime updates
const TakeoverChatDialog = ({ 
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
  const releaseSession = useReleaseSession();
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!session.conversation_id || !open) return;

    const channel = supabase
      .channel(`takeover-${session.conversation_id}`)
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

  const handleRelease = async () => {
    await releaseSession.mutateAsync(session.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b bg-yellow-50 dark:bg-yellow-900/20">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hand className="w-5 h-5 text-yellow-600" />
              <span>Takeover: {session.phone_number}</span>
            </div>
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
              Mode Manual
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
                      ? 'bg-green-500 text-white rounded-br-md'
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
          <div className="flex gap-2 mb-3">
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
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleRelease}
            disabled={releaseSession.isPending}
          >
            <Bot className="w-4 h-4 mr-2" />
            Serahkan Kembali ke AI
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const SessionRow = ({ session }: { session: WhatsAppSessionWithMessages }) => {
  const toggleBlock = useToggleBlockSession();
  const deleteSession = useDeleteWhatsAppSession();
  const takeoverSession = useTakeoverSession();
  const [takeoverOpen, setTakeoverOpen] = useState(false);

  const handleTakeover = async () => {
    await takeoverSession.mutateAsync(session.id);
    setTakeoverOpen(true);
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
            <Phone className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{session.phone_number}</p>
              {session.is_takeover && (
                <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">
                  <Hand className="w-3 h-3 mr-1" />
                  Takeover
                </Badge>
              )}
              {session.is_blocked && (
                <Badge variant="destructive" className="text-xs">Diblokir</Badge>
              )}
              {session.chat_conversations?.booking_created && (
                <Badge variant="default" className="text-xs bg-green-600">Booking</Badge>
              )}
            </div>
            {session.guest_name && (
              <p className="text-sm text-muted-foreground">{session.guest_name}</p>
            )}
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
          {session.is_takeover ? (
            <Button
              variant="outline"
              size="sm"
              className="text-yellow-700 border-yellow-300 hover:bg-yellow-50"
              onClick={() => setTakeoverOpen(true)}
            >
              <MessageCircle className="w-4 h-4 mr-1" />
              Chat
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleTakeover}
              disabled={takeoverSession.isPending || session.is_blocked}
            >
              <Hand className="w-4 h-4 mr-1" />
              Ambil Alih
            </Button>
          )}

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
                  Session WhatsApp dari {session.phone_number} akan dihapus permanen beserta riwayat percakapannya.
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

      <TakeoverChatDialog 
        session={session} 
        open={takeoverOpen} 
        onOpenChange={setTakeoverOpen} 
      />
    </>
  );
};

const WhatsAppSessionsTab = () => {
  // Filter only guest sessions
  const { data: sessions, isLoading } = useWhatsAppSessions('guest');
  const { data: stats } = useWhatsAppStats('guest');
  const { settings, updateSettings, isUpdating } = useHotelSettings();
  const [search, setSearch] = useState('');

  const filteredSessions = sessions?.filter(session =>
    session.phone_number.toLowerCase().includes(search.toLowerCase())
  );

  const handleModeChange = (mode: 'ai' | 'manual') => {
    updateSettings({ whatsapp_response_mode: mode });
  };

  return (
    <div className="space-y-6">
      {/* Response Mode Card */}
      <Card className={settings?.whatsapp_response_mode === 'manual' ? 'border-yellow-400 bg-yellow-50/50 dark:bg-yellow-900/10' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-muted-foreground" />
              <CardTitle className="text-base">Mode Balasan WhatsApp</CardTitle>
            </div>
            {settings?.whatsapp_response_mode === 'manual' && (
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                <Hand className="w-3 h-3 mr-1" />
                Mode Manual Aktif
              </Badge>
            )}
          </div>
          <CardDescription>
            Pilih cara membalas pesan WhatsApp masuk
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup 
            value={settings?.whatsapp_response_mode || 'ai'} 
            onValueChange={(value) => handleModeChange(value as 'ai' | 'manual')}
            disabled={isUpdating}
            className="flex flex-col sm:flex-row gap-4"
          >
            <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer flex-1">
              <RadioGroupItem value="ai" id="mode-ai" />
              <Label htmlFor="mode-ai" className="flex items-center gap-2 cursor-pointer flex-1">
                <Bot className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">AI Chatbot (Otomatis)</p>
                  <p className="text-xs text-muted-foreground">Semua pesan dijawab otomatis oleh AI</p>
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer flex-1">
              <RadioGroupItem value="manual" id="mode-manual" />
              <Label htmlFor="mode-manual" className="flex items-center gap-2 cursor-pointer flex-1">
                <Hand className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="font-medium">Manual (Admin Reply)</p>
                  <p className="text-xs text-muted-foreground">Semua pesan masuk ke admin untuk dijawab manual</p>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <StatCard 
          title="Total Sessions" 
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
          title="Takeover" 
          value={stats?.takeoverSessions || 0} 
          icon={Hand}
          variant="warning"
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
        <StatCard 
          title="Booking" 
          value={stats?.bookingsCreated || 0} 
          icon={CalendarCheck}
          variant="success"
        />
        <StatCard 
          title="Konversi" 
          value={`${stats?.conversionRate || 0}%`} 
          icon={CalendarCheck}
        />
      </div>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-green-500" />
                WhatsApp Sessions
              </CardTitle>
              <CardDescription>
                Monitor dan kelola percakapan WhatsApp
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nomor telepon..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Memuat sessions...
            </div>
          ) : filteredSessions && filteredSessions.length > 0 ? (
            <div className="space-y-3">
              {filteredSessions.map((session) => (
                <SessionRow key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {search ? 'Tidak ada session yang cocok' : 'Belum ada WhatsApp session'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppSessionsTab;
