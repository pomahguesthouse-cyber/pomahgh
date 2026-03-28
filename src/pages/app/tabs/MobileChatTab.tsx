import { useState } from "react";
import { useWhatsAppSessions } from "@/hooks/useWhatsAppSessions";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, MessageCircle, Search, User, Clock, Send } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";

export const MobileChatTab = () => {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const { sessions = [], isLoading, takeoverSession, releaseSession } = useWhatsAppSessions();

  if (selectedSessionId) {
    return (
      <MobileChatView
        sessionId={selectedSessionId}
        onBack={() => setSelectedSessionId(null)}
        sessions={sessions}
        takeoverSession={takeoverSession}
        releaseSession={releaseSession}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 bg-card border-b border-border">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-green-500" />
          WhatsApp Sessions
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Memuat...</div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Belum ada sesi WhatsApp</div>
        ) : (
          sessions.map((session: any) => (
            <button
              key={session.id}
              onClick={() => setSelectedSessionId(session.id)}
              className="w-full text-left px-4 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors flex items-start gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm text-foreground truncate">
                    {session.guest_name || session.phone_number}
                  </span>
                  {session.is_takeover && (
                    <Badge variant="outline" className="text-[10px] border-orange-400 text-orange-500 flex-shrink-0">
                      Takeover
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {session.phone_number}
                </p>
                <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(parseISO(session.updated_at || session.created_at), {
                    addSuffix: true,
                    locale: id,
                  })}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

// Chat view for individual session
const MobileChatView = ({
  sessionId,
  onBack,
  sessions,
  takeoverSession,
  releaseSession,
}: {
  sessionId: string;
  onBack: () => void;
  sessions: any[];
  takeoverSession: any;
  releaseSession: any;
}) => {
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const session = sessions.find((s: any) => s.id === sessionId);

  const { data: messages = [], refetch } = useQuery({
    queryKey: ["mobile-chat-messages", session?.conversation_id],
    queryFn: async () => {
      if (!session?.conversation_id) return [];
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, content, role, created_at")
        .eq("conversation_id", session.conversation_id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!session?.conversation_id,
    refetchInterval: 5000,
  });

  const handleSendReply = async () => {
    if (!replyText.trim() || !session?.phone_number) return;
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-webhook", {
        body: {
          action: "send_message",
          phone: session.phone_number,
          message: replyText.trim(),
          conversation_id: session.conversation_id,
        },
      });

      if (error) throw error;
      setReplyText("");
      refetch();
      toast.success("Pesan terkirim");
    } catch (err: any) {
      toast.error("Gagal mengirim", { description: err.message });
    }
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 bg-card border-b border-border flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="p-1">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate">
            {session?.guest_name || session?.phone_number}
          </p>
          <p className="text-xs text-muted-foreground">{session?.phone_number}</p>
        </div>
        {session?.is_takeover ? (
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => releaseSession.mutate(sessionId)}>
            Release
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => takeoverSession.mutate(sessionId)}>
            Takeover
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/30">
        {messages.map((msg: any) => (
          <div
            key={msg.id}
            className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
              msg.role === "user"
                ? "bg-card border border-border text-foreground self-start"
                : "bg-primary text-primary-foreground ml-auto"
            }`}
            style={{ alignSelf: msg.role === "user" ? "flex-start" : "flex-end" }}
          >
            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
            <span className={`text-[10px] mt-1 block ${msg.role === "user" ? "text-muted-foreground" : "text-primary-foreground/70"}`}>
              {new Date(msg.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        ))}
      </div>

      {/* Reply input */}
      {session?.is_takeover && (
        <div className="p-3 bg-card border-t border-border flex gap-2">
          <Input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Ketik balasan..."
            className="flex-1 h-9 text-sm"
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendReply()}
          />
          <Button size="sm" disabled={sending || !replyText.trim()} onClick={handleSendReply} className="h-9">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
