import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useWhatsAppSessionMessages, WhatsAppSessionWithMessages } from '@/hooks/useWhatsAppSessions';
import { Phone, Eye, Shield } from 'lucide-react';
import { MessageBubble } from './MessageBubble';

interface SessionMessagesDialogProps {
  session: WhatsAppSessionWithMessages;
  variant?: 'guest' | 'admin';
}

export const SessionMessagesDialog = ({ session, variant = 'guest' }: SessionMessagesDialogProps) => {
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
            {variant === 'admin' && (
              <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-800 border-blue-300">
                <Shield className="w-3 h-3 mr-1" />
                Admin
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Memuat pesan...</p>
          ) : messages && messages.length > 0 ? (
            <div className="space-y-3">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  content={msg.content}
                  role={msg.role as 'user' | 'assistant'}
                  timestamp={msg.created_at}
                  variant={variant}
                />
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












