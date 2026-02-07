import { useState } from "react";
import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { VoiceChatModal } from "./VoiceChatModal";

const VoiceChatButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Voice Chat Button - positioned above chatbot button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            "fixed bottom-20 right-4 z-50",
            "w-12 h-12 rounded-full",
            "bg-accent text-accent-foreground",
            "shadow-lg hover:shadow-xl",
            "flex items-center justify-center",
            "transition-all duration-300 hover:scale-105",
            "group"
          )}
          aria-label="Voice Chat"
          title="Voice Chat - Bicara dengan asisten AI"
        >
          <Mic className="w-5 h-5" />
          
          {/* Tooltip */}
          <span className="absolute right-14 bg-foreground text-background text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Voice Chat
          </span>
        </button>
      )}

      <VoiceChatModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default VoiceChatButton;
