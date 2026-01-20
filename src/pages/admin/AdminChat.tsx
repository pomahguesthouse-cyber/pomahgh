import { useState, useRef, useEffect } from "react";
import { Bot, Send, Trash2, Sparkles, Calendar, BarChart3, Building, ClipboardList, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminChatbot } from "@/hooks/useAdminChatbot";

const quickActions = [
  {
    label: "Cek ketersediaan hari ini",
    prompt: "Berapa kamar yang tersedia hari ini?",
    icon: Calendar,
  },
  {
    label: "Statistik bulan ini",
    prompt: "Tampilkan statistik booking bulan ini",
    icon: BarChart3,
  },
  {
    label: "Daftar kamar",
    prompt: "Tampilkan daftar semua kamar dan statusnya",
    icon: Building,
  },
  {
    label: "Booking terbaru",
    prompt: "Tampilkan 5 booking terbaru",
    icon: ClipboardList,
  },
];

const AdminChat = () => {
  const [input, setInput] = useState("");
  const { messages, isLoading, sendMessage, clearChat } = useAdminChatbot();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

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

  const handleQuickAction = (prompt: string) => {
    sendMessage(prompt);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-6">
      <Card className="flex flex-col flex-1 overflow-hidden">
        <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Asisten Booking AI</CardTitle>
              <p className="text-sm text-muted-foreground">
                Kelola booking dengan perintah natural language
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearChat}
              disabled={messages.length === 0 || isLoading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Hapus Chat
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.history.back()}
              title="Tutup"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          {/* Quick Actions */}
          <div className="flex-shrink-0 p-4 border-b bg-muted/30">
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction(action.prompt)}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="p-4 bg-primary/10 rounded-full mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Selamat datang di Asisten Booking
                </h3>
                <p className="text-muted-foreground max-w-md">
                  Saya bisa membantu Anda cek ketersediaan kamar, melihat
                  statistik booking, mencari booking, dan membuat booking baru.
                  Coba gunakan quick actions di atas atau ketik pesan Anda.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm">
                        {message.content}
                      </p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-primary rounded-full animate-bounce" />
                        <div
                          className="h-2 w-2 bg-primary rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        />
                        <div
                          className="h-2 w-2 bg-primary rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="flex-shrink-0 p-4 border-t bg-background">
            <div className="flex gap-3">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ketik pesan... (Enter untuk kirim, Shift+Enter untuk baris baru)"
                className="min-h-[60px] max-h-[120px] resize-none"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="lg"
                className="px-6"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminChat;
