import { useState, useRef, useEffect } from "react";
import { Send, X, Trash2, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAdminChatbot } from "@/hooks/admin/useAdminChatbot";
import { cn } from "@/lib/utils";

interface AdminChatbotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const quickActions = [
  { label: "Cek ketersediaan hari ini", message: "Berapa kamar tersedia hari ini?" },
  { label: "Statistik bulan ini", message: "Berapa total booking bulan ini?" },
  { label: "Daftar kamar", message: "Tampilkan daftar semua kamar" },
  { label: "Booking terbaru", message: "Tampilkan 5 booking terbaru" },
];

export const AdminChatbotDialog = ({ open, onOpenChange }: AdminChatbotDialogProps) => {
  const [input, setInput] = useState("");
  const { messages, isLoading, sendMessage, clearChat } = useAdminChatbot();

  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (message: string) => {
    setInput(message);
    inputRef.current?.focus();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col overflow-hidden">
        {/* HEADER */}
        <SheetHeader className="relative z-10 px-4 py-3 border-b bg-background">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <SheetTitle className="text-base">Asisten Booking</SheetTitle>
          </div>
        </SheetHeader>

        {/* CHAT AREA */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="text-center text-muted-foreground text-sm py-8">
                  <Bot className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="font-medium">Halo! Saya Asisten Booking.</p>
                  <p className="mt-1">Saya bisa bantu cek ketersediaan, statistik booking, dan laporan cepat.</p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Quick Actions:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {quickActions.map((action, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="h-auto py-2 px-3 text-xs text-left justify-start"
                        onClick={() => handleQuickAction(action.message)}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "assistant" && (
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}

                <div
                  className={cn(
                    "rounded-lg px-3 py-2 max-w-[85%] text-sm whitespace-pre-wrap",
                    msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  {msg.content}
                </div>

                {msg.role === "user" && (
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2 justify-start">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* FOOTER */}
        <div className="p-4 border-t">
          <div className="flex gap-2 items-center">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ketik pesan..."
              disabled={isLoading}
              className="flex-1"
            />

            {/* Kirim */}
            <Button onClick={handleSend} disabled={!input.trim() || isLoading} size="icon" aria-label="Kirim pesan">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>

            {/* Reset */}
            <Button
              variant="outline"
              size="icon"
              onClick={clearChat}
              disabled={messages.length === 0}
              aria-label="Reset chat"
              title="Reset chat"
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            {/* Close (red soft) */}
            <Button
              variant="destructive"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="Tutup chat"
              title="Tutup chat"
              className="opacity-70 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};












