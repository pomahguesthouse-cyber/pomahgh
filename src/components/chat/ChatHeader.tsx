import { Button } from "@/components/ui/button";
import { RotateCcw, Share2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface ChatHeaderProps {
  botName: string;
  hotelName: string;
  logoUrl?: string;
  onClearChat: () => void;
}

const ChatHeader = ({ botName, hotelName, logoUrl, onClearChat }: ChatHeaderProps) => {
  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success("Link berhasil disalin!");
  };

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b bg-card">
      <div className="flex items-center gap-3">
        {logoUrl ? (
          <img src={logoUrl} alt={hotelName} className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-primary" />
          </div>
        )}
        <div>
          <h1 className="font-semibold text-foreground">{botName || "AI Assistant"}</h1>
          <p className="text-xs text-muted-foreground">{hotelName}</p>
        </div>
        <span className="ml-2 flex items-center gap-1 text-xs text-green-600">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          Online
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onClearChat} title="Reset Chat">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleShare} title="Share Link">
          <Share2 className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
};

export default ChatHeader;












