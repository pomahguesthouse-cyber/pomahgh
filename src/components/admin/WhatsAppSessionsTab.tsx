import { useState } from 'react';
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
  WhatsAppSessionWithMessages 
} from '@/hooks/useWhatsAppSessions';
import { Phone, MessageSquare, Ban, Unlock, Trash2, Eye, Search, Users, ShieldCheck, ShieldX, MessageCircle, CalendarCheck } from 'lucide-react';
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

const SessionRow = ({ session }: { session: WhatsAppSessionWithMessages }) => {
  const toggleBlock = useToggleBlockSession();
  const deleteSession = useDeleteWhatsAppSession();

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-4">
        <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
          <Phone className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{session.phone_number}</p>
            {session.is_blocked && (
              <Badge variant="destructive" className="text-xs">Diblokir</Badge>
            )}
            {session.chat_conversations?.booking_created && (
              <Badge variant="default" className="text-xs bg-green-600">Booking</Badge>
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
  );
};

const WhatsAppSessionsTab = () => {
  const { data: sessions, isLoading } = useWhatsAppSessions();
  const { data: stats } = useWhatsAppStats();
  const [search, setSearch] = useState('');

  const filteredSessions = sessions?.filter(session =>
    session.phone_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
