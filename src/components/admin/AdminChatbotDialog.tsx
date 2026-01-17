import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Smartphone, RefreshCw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useAdminChatbot } from '@/hooks/useAdminChatbot';
import { cn } from '@/lib/utils';

interface AdminChatbotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const quickActions = [
  { label: 'Cek ketersediaan hari ini', message: 'Berapa kamar tersedia hari ini?' },
  { label: 'Statistik bulan ini', message: 'Berapa total booking bulan ini?' },
  { label: 'Daftar kamar', message: 'Tampilkan daftar semua kamar' },
  { label: 'Booking terbaru', message: 'Tampilkan 5 booking terbaru' },
];

export const AdminChatbotDialog = ({ open, onOpenChange }: AdminChatbotDialogProps) => {
  const [input, setInput] = useState('');
  const { messages, isLoading, sendMessage, clearChat } = useAdminChatbot();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (message: string) => {
    sendMessage(message);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-md p-0 flex flex-col"
        hideCloseButton={true}
      >
        {/* Header dengan styling baru */}
        <div className="px-4 py-3 border-b flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-foreground" />
            <span className="text-lg font-bold">Booking Management</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-teal-50"
              onClick={clearChat}
              disabled={messages.length === 0}
              title="Refresh Chat"
            >
              <RefreshCw className="h-5 w-5 text-teal-500" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-red-50"
              onClick={() => onOpenChange(false)}
              title="Tutup"
            >
              <XCircle className="h-6 w-6 text-red-500" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="space-y-6">
              {/* Welcome Area dengan styling baru */}
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Bot className="h-10 w-10 text-gray-500" />
                </div>
                <p className="font-semibold text-gray-800">Halo! Saya Asisten Booking.</p>
                <p className="mt-2 text-sm text-gray-600 px-4">
                  Saya bisa bantu cek ketersediaan, statistik booking, dan buat booking baru.
                </p>
              </div>
              
              {/* Quick Actions dengan styling baru */}
              <div className="space-y-3">
                <p className="text-sm text-gray-600 font-medium">Quick Actions:</p>
                <div className="grid grid-cols-2 gap-3">
                  {quickActions.map((action, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      className="h-auto py-3 px-4 text-sm text-left justify-start border-teal-400 text-teal-600 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-500"
                      onClick={() => handleQuickAction(action.message)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex gap-2',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div className="h-7 w-7 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-teal-600" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'rounded-lg px-3 py-2 max-w-[85%] text-sm whitespace-pre-wrap',
                      msg.role === 'user'
                        ? 'bg-teal-500 text-white'
                        : 'bg-gray-100 text-gray-800'
                    )}
                  >
                    {msg.content || (msg.role === 'assistant' && isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null)}
                  </div>
                  {msg.role === 'user' && (
                    <div className="h-7 w-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Input Area dengan styling baru */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex gap-3">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ketik pesan..."
              disabled={isLoading}
              className="flex-1 bg-white border-gray-200"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="rounded-lg bg-teal-400 hover:bg-teal-500 text-white"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
