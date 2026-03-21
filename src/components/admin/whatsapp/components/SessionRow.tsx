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
import { MessageSquare, Ban, Unlock, Trash2, Hand, MessageCircle } from 'lucide-react';
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

  const handleTakeover = () => {
    takeoverSession.mutate(session.id, {
      onSuccess: () => setTakeoverOpen(true)
    });
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border rounded-lg hover:bg-muted/50 transition-colors">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30 flex-shrink-0">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="font-medium text-sm sm:text-base truncate">
                {session.guest_name || session.phone_number}
              </p>
              {session.guest_name && (
                <span className="text-xs text-muted-foreground">{session.phone_number}</span>
              )}
              {!session.guest_name && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-gray-100 text-gray-500 border-gray-300">
                  Tanpa Nama
                </Badge>
              )}
              {session.is_takeover && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-yellow-100 text-yellow-800 border-yellow-300">
                  <Hand className="w-3 h-3 mr-0.5" />
                  Takeover
                </Badge>
              )}
              {session.is_blocked && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Diblokir</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {session.chat_conversations?.message_count || 0} pesan
              </span>
              {session.last_message_at && (
                <span className="truncate">Terakhir: {formatDateTimeID(session.last_message_at)}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 ml-11 sm:ml-0 flex-shrink-0">
          {session.is_takeover ? (
            <Button
              variant="outline"
              size="sm"
              className="text-yellow-700 border-yellow-300 hover:bg-yellow-50 h-8 px-2 sm:px-3 text-xs"
              onClick={() => setTakeoverOpen(true)}
            >
              <MessageCircle className="w-3.5 h-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Chat</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 sm:px-3 text-xs"
              onClick={handleTakeover}
              disabled={takeoverSession.isPending || !!session.is_blocked}
            >
              <Hand className="w-3.5 h-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Ambil Alih</span>
            </Button>
          )}

          <SessionMessagesDialog session={session} variant="guest" />
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => toggleBlock.mutate({ id: session.id, isBlocked: !session.is_blocked })}
            disabled={toggleBlock.isPending}
          >
            {session.is_blocked ? <Unlock className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus Session?</AlertDialogTitle>
                <AlertDialogDescription>
                  Session WhatsApp dari {session.phone_number} akan dihapus permanen.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteSession.mutate(session.id)}
                  className="bg-destructive text-destructive-foreground"
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
