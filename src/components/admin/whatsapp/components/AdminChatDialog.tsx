import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WhatsAppSessionWithMessages } from '@/hooks/useWhatsAppSessions';
import { Shield, Send } from 'lucide-react';
import { useAdminChat } from '../hooks';
import { MessageBubble } from './MessageBubble';

interface AdminChatDialogProps {
  session: WhatsAppSessionWithMessages;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AdminChatDialog = ({ session, open, onOpenChange }: AdminChatDialogProps) => {
  const {
    messages,
    newMessage,
    setNewMessage,
    send,
    scrollRef,
    isSending,
  } = useAdminChat(session, open);

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
              <MessageBubble
                key={msg.id}
                content={msg.content}
                role={msg.role as 'user' | 'assistant'}
                timestamp={msg.created_at}
                variant="admin"
              />
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
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
              className="flex-1"
              autoFocus
            />
            <Button 
              onClick={send} 
              disabled={isSending || !newMessage.trim()}
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
