import { useState, useRef, useEffect } from "react";
import { Send, X, Trash2, Bot, User, Loader2, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAdminChatbot } from "@/hooks/useAdminChatbot";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    isListening,
    isSupported,
    toggleListening,
    error: voiceError,
  } = useVoiceInput({
    onFinalTranscript: (transcript) => {
      setInput((prev) => prev + transcript);
    },
  });

  useEffect(() => {
    if (voiceError) {
      toast.error(voiceError);
    }
  }, [voiceError]);

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
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (message: string) => {
    sendMessage(message);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <SheetTitle className="text-base">Asisten Booking</SheetTitle>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={clearChat}
              disabled={messages.length === 0}
              aria-label="Reset chat"
              title="Reset chat"
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onOpenChange(false)}
              aria-label="Tutup chat"
              title="Tutup chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="space-y-4">
              <div className="text-center text-muted-foreground text-sm py-8">
                <Bot className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="font-medium">Halo! Saya Asisten Booking.</p>
                <p className="mt-1">Saya bisa bantu cek ketersediaan, statistik booking, dan buat booking baru.</p>
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
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                  {msg.role === "assistant" && (
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "rounded-lg px-3 py-2 max-w-[85%] text-sm whitespace-pre-wrap",
                      msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                    )}
                  >
                    {msg.content ||
                      (msg.role === "assistant" && isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null)}
                  </div>
                  {msg.role === "user" && (
                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "🎤 Mendengarkan..." : "Ketik pesan..."}
              disabled={isLoading}
              className={`flex-1 ${isListening ? "border-primary ring-2 ring-primary/20" : ""}`}
            />
            {isSupported && (
              <Button
                onClick={toggleListening}
                disabled={isLoading}
                size="icon"
                variant={isListening ? "destructive" : "outline"}
                title={isListening ? "Berhenti merekam" : "Mulai bicara"}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            )}
            <Button onClick={handleSend} disabled={!input.trim() || isLoading} size="icon">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
