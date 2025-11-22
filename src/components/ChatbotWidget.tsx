import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Loader2, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { useChatbot } from "@/hooks/useChatbot";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const { messages, isLoading, sendMessage, settings } = useChatbot();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // Initialize Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'id-ID';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsRecording(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        toast({
          title: "Error",
          description: "Gagal merekam suara. Pastikan mikrofon diizinkan.",
          variant: "destructive",
        });
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [toast]);

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return;
    sendMessage(inputValue);
    setInputValue("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Tidak Didukung",
        description: "Browser Anda tidak mendukung voice input.",
        variant: "destructive",
      });
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        toast({
          title: "Merekam",
          description: "Silakan bicara sekarang...",
        });
      } catch (error) {
        console.error('Error starting recognition:', error);
        toast({
          title: "Error",
          description: "Gagal memulai perekaman suara.",
          variant: "destructive",
        });
      }
    }
  };

  if (!settings) return null;

  const position = settings.widget_position === "bottom-left" ? "left-4" : "right-4";

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className={cn(
            "fixed bottom-8 right-6 w-12 h-12 rounded-full shadow-lg z-50 transition-all hover:scale-110",
            position,
          )}
          style={{ backgroundColor: settings.primary_color }}
        >
          <MessageCircle className="w-5 h-5 text-white" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card
          className={cn("fixed bottom-4 w-[90vw] sm:w-80 h-[480px] max-w-sm shadow-2xl z-50 flex flex-col", position)}
        >
          {/* Header */}
          <div
            className="p-3 rounded-t-lg flex items-center justify-between"
            style={{ backgroundColor: settings.primary_color }}
          >
            <div className="flex items-center gap-2">
              <Avatar
                className={cn(
                  "h-8 w-8",
                  settings.bot_avatar_style === "circle"
                    ? "rounded-full"
                    : settings.bot_avatar_style === "square"
                      ? "rounded-none"
                      : "rounded-md",
                )}
              >
                <AvatarImage src={settings.bot_avatar_url} />
                <AvatarFallback className="bg-white text-primary text-sm">{settings.bot_name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-white">{settings.bot_name}</p>
                <p className="text-xs text-white/80">Online</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-3">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <p className="text-sm">{settings.greeting_message}</p>
              </div>
            )}

            {messages.map((message, index) => (
              <div key={index} className={cn("mb-3 flex", message.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-4 py-2",
                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && settings.show_typing_indicator && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Mengetik...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ketik pesan atau gunakan voice..."
                maxLength={settings.max_message_length}
                disabled={isLoading || isRecording}
                className="flex-1"
              />
              <Button
                onClick={toggleRecording}
                disabled={isLoading}
                size="icon"
                variant={isRecording ? "destructive" : "outline"}
                className={cn(isRecording && "animate-pulse")}
              >
                {isRecording ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </Button>
              <Button
                onClick={handleSend}
                disabled={isLoading || !inputValue.trim()}
                size="icon"
                style={{ backgroundColor: settings.primary_color }}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Send className="w-4 h-4 text-white" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
};

export default ChatbotWidget;
