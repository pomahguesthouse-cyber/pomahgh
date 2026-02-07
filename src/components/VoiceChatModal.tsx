import { useEffect, useRef } from "react";
import { X, Mic, MicOff, Volume2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useVoiceChat, type VoiceChatState } from "@/hooks/useVoiceChat";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const stateLabels: Record<VoiceChatState, string> = {
  idle: "Tekan mikrofon untuk bicara",
  listening: "Mendengarkan...",
  processing: "Memproses...",
  speaking: "Menjawab...",
};

const stateColors: Record<VoiceChatState, string> = {
  idle: "bg-muted",
  listening: "bg-destructive",
  processing: "bg-secondary",
  speaking: "bg-accent",
};

const VoiceWaveAnimation = ({ state }: { state: VoiceChatState }) => {
  const isActive = state === "listening" || state === "speaking";

  return (
    <div className="flex items-center justify-center gap-1 h-12">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className={cn(
            "w-1 rounded-full",
            state === "listening"
              ? "bg-destructive/70"
              : state === "speaking"
              ? "bg-accent/70"
              : "bg-muted-foreground/30"
          )}
          animate={
            isActive
              ? {
                  height: [8, 24 + Math.random() * 16, 8],
                }
              : { height: 8 }
          }
          transition={
            isActive
              ? {
                  duration: 0.6 + i * 0.1,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.1,
                }
              : { duration: 0.3 }
          }
        />
      ))}
    </div>
  );
};

export const VoiceChatModal = ({ isOpen, onClose }: VoiceChatModalProps) => {
  const {
    state,
    transcripts,
    partialTranscript,
    startListening,
    stopListening,
    disconnect,
    stopAudio,
  } = useVoiceChat();

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts, partialTranscript]);

  const handleClose = () => {
    disconnect();
    onClose();
  };

  const handleMicToggle = () => {
    if (state === "listening") {
      stopListening();
    } else if (state === "idle") {
      startListening();
    } else if (state === "speaking") {
      stopAudio();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed bottom-4 right-4 w-[90vw] sm:w-80 max-w-sm z-50"
      >
        <div className="bg-card rounded-2xl shadow-2xl border overflow-hidden flex flex-col h-[480px]">
          {/* Header */}
          <div className="bg-primary p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Volume2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Voice Chat</p>
                <p className="text-xs text-white/80">Asisten Hotel AI</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="text-white hover:bg-white/20 h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Voice Wave + Status */}
          <div className="flex flex-col items-center py-4 border-b">
            <VoiceWaveAnimation state={state} />
            <div className="flex items-center gap-2 mt-2">
              <div
                className={cn("w-2 h-2 rounded-full", stateColors[state])}
              />
              <span className="text-xs text-muted-foreground">
                {stateLabels[state]}
              </span>
            </div>
          </div>

          {/* Transcript Area */}
          <ScrollArea className="flex-1 p-3">
            {transcripts.length === 0 && state === "idle" && (
              <div className="text-center text-muted-foreground py-8 px-4">
                <Volume2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">
                  Tekan tombol mikrofon dan mulai bicara untuk bertanya tentang
                  hotel, kamar, atau booking.
                </p>
              </div>
            )}

            {transcripts.map((t, i) => (
              <div
                key={i}
                className={cn(
                  "mb-2 flex",
                  t.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2",
                    t.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <p className="text-xs whitespace-pre-wrap">{t.text}</p>
                </div>
              </div>
            ))}

            {partialTranscript && state === "listening" && (
              <div className="flex justify-end mb-2">
                <div className="max-w-[85%] rounded-lg px-3 py-2 bg-primary/20 border border-primary/30">
                  <p className="text-xs text-primary italic">
                    {partialTranscript}
                  </p>
                </div>
              </div>
            )}

            {state === "processing" && (
              <div className="flex justify-start mb-2">
                <div className="rounded-lg px-3 py-2 bg-muted flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span className="text-xs text-muted-foreground">
                    Memproses...
                  </span>
                </div>
              </div>
            )}

            <div ref={scrollRef} />
          </ScrollArea>

          {/* Mic Button */}
          <div className="p-4 flex justify-center border-t">
            <button
              onClick={handleMicToggle}
              disabled={state === "processing"}
              className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg",
                state === "listening"
                  ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground scale-110 animate-pulse"
                  : state === "speaking"
                  ? "bg-accent hover:bg-accent/90 text-accent-foreground"
                  : state === "processing"
                  ? "bg-secondary text-secondary-foreground cursor-not-allowed opacity-70"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              )}
            >
              {state === "processing" ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : state === "listening" ? (
                <MicOff className="w-6 h-6" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
