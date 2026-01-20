import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WhatsAppSessionWithMessages } from '@/hooks/useWhatsAppSessions';
import { Hand, Bot, Send } from 'lucide-react';
import { useTakeoverChat } from '../hooks';
import { MessageBubble } from './MessageBubble';

interface TakeoverChatDialogProps {
  session: WhatsAppSessionWithMessages;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TakeoverChatDialog = ({ session, open, onOpenChange }: TakeoverChatDialogProps) => {
  const {
    messages,
    newMessage,
    setNewMessage,
    send,
    release,
    scrollRef,
    isSending,
    isReleasing,
  } = useTakeoverChat(session, open);

  const handleRelease = async () => {
    await release();
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
              <MessageBubble
                key={msg.id}
                content={msg.content}
                role={msg.role as 'user' | 'assistant'}
                timestamp={msg.created_at}
                variant="guest"
              />
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
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleRelease}
            disabled={isReleasing}
          >
            <Bot className="w-4 h-4 mr-2" />
            Serahkan Kembali ke AI
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
