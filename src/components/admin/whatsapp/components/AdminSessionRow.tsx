import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  useToggleBlockSession, 
  useDeleteWhatsAppSession,
  WhatsAppSessionWithMessages 
} from '@/hooks/useWhatsAppSessions';
import { Shield, MessageSquare, Ban, Unlock, Trash2, MessageCircle } from 'lucide-react';
import { formatDateTimeID } from '@/utils/indonesianFormat';
import { SessionMessagesDialog } from './SessionMessagesDialog';
import { AdminChatDialog } from './AdminChatDialog';

interface AdminSessionRowProps {
  session: WhatsAppSessionWithMessages;
}

export const AdminSessionRow = ({ session }: AdminSessionRowProps) => {
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

          <SessionMessagesDialog session={session} variant="admin" />
          
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
