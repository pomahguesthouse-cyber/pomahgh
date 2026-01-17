import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  useToggleBlockSession, 
  useDeleteWhatsAppSession,
  useTakeoverSession,
  WhatsAppSessionWithMessages 
} from '@/hooks/useWhatsAppSessions';
import { Phone, MessageSquare, Ban, Unlock, Trash2, MessageCircle, Hand } from 'lucide-react';
import { formatDateTimeID } from '@/utils/indonesianFormat';
import { SessionMessagesDialog } from './SessionMessagesDialog';
import { TakeoverChatDialog } from './TakeoverChatDialog';

interface SessionRowProps {
  session: WhatsAppSessionWithMessages;
}

export const SessionRow = ({ session }: SessionRowProps) => {
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

          <SessionMessagesDialog session={session} variant="guest" />
          
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
