import { useState, useRef, useEffect } from "react";
import { Send, Trash2, Loader2, Bot, User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePromptConsultant, PromptConsultantMessage } from "@/hooks/usePromptConsultant";

const QUICK_ACTIONS = [
  { label: "Review prompt saya", prompt: "Tolong review dan optimasi prompt berikut ini:\n\n[paste prompt di sini]" },
  { label: "Tips hemat token", prompt: "Apa saja tips untuk menulis prompt yang hemat token?" },
  { label: "Contoh prompt fitur", prompt: "Berikan contoh prompt yang baik untuk menambahkan fitur baru" },
  { label: "Contoh prompt bug fix", prompt: "Berikan contoh prompt yang efektif untuk memperbaiki bug" },
];

interface MessageBubbleProps {
  message: PromptConsultantMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn(
      "flex gap-3 p-3 rounded-lg",
      isUser ? "bg-primary/10" : "bg-muted/50"
    )}>
      <div className={cn(
        "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
        isUser ? "bg-primary text-primary-foreground" : "bg-gradient-to-br from-violet-500 to-purple-600 text-white"
      )}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className="flex-1 space-y-1 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {isUser ? 'Anda' : 'Prompt Consultant'}
          </span>
          {!isUser && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Sparkles className="h-3 w-3" />
              AI
            </Badge>
          )}
        </div>
        <div className="text-sm prose prose-sm dark:prose-invert max-w-none break-words whitespace-pre-wrap">
          {message.content || (
            <span className="text-muted-foreground italic">Thinking...</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function PromptConsultantChat() {
  const { messages, isLoading, sendMessage, clearChat } = usePromptConsultant();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
    textareaRef.current?.focus();
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="pb-3 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Prompt Consultant</CardTitle>
              <p className="text-xs text-muted-foreground">
                Konsultan AI untuk menulis prompt yang efisien
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearChat}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm p-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Sedang berpikir...</span>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Quick Actions */}
        <div className="px-4 py-2 border-t bg-muted/30 flex-shrink-0">
          <p className="text-xs text-muted-foreground mb-2">Quick Actions:</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => handleQuickAction(action.prompt)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-t flex-shrink-0">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ketik pertanyaan Anda tentang prompt engineering..."
              className="min-h-[60px] max-h-[120px] resize-none"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="h-auto px-4"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Tekan Enter untuk mengirim, Shift+Enter untuk baris baru
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
