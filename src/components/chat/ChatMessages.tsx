import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading?: boolean;
  botName?: string;
}

const ChatMessages = ({ messages, isLoading, botName }: ChatMessagesProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <ScrollArea className="flex-1 px-4">
      <div className="py-4 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="text-center py-12 text-muted-foreground">
            <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Halo! 👋</p>
            <p className="text-sm mt-1">Ada yang bisa saya bantu?</p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              "flex gap-3",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role === "assistant" && (
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5",
                message.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted rounded-bl-md"
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p
                className={cn(
                  "text-[10px] mt-1",
                  message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                )}
              >
                {formatTime(message.timestamp)}
              </p>
            </div>

            {message.role === "user" && (
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>
    </ScrollArea>
  );
};

export default ChatMessages;
