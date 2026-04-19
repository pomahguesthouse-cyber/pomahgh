import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Bell, Clock } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { id } from "date-fns/locale";

interface Notification {
  id: string;
  type: "whatsapp" | "booking";
  title: string;
  description: string;
  timestamp: string;
}

// Cap live notifications buffer to prevent unbounded memory growth on long sessions.
const MAX_LIVE_NOTIFS = 100;

export const MobileNotificationsTab = () => {
  const [liveNotifs, setLiveNotifs] = useState<Notification[]>([]);

  // Fetch recent WhatsApp messages as notification history
  const { data: recentMessages = [] } = useQuery({
    queryKey: ["mobile-notif-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select(`
          id, content, created_at, conversation_id,
          chat_conversations!inner(session_id)
        `)
        .eq("role", "user")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 15000,
  });

  // Fetch recent bookings
  const { data: recentBookings = [] } = useQuery({
    queryKey: ["mobile-notif-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, guest_name, booking_code, room_id, created_at, status, rooms(name)")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Real-time listener for new messages
  useEffect(() => {
    const channel = supabase
      .channel("mobile-notif-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: "role=eq.user" },
        async (payload) => {
          const msg = payload.new;
          // Try to get phone number
          let phone = "";
          if (msg.conversation_id) {
            const { data } = await supabase
              .from("whatsapp_sessions")
              .select("phone_number")
              .eq("conversation_id", msg.conversation_id)
              .single();
            phone = data?.phone_number || "";
          }

          setLiveNotifs((prev) => [
            {
              id: msg.id,
              type: "whatsapp" as const,
              title: phone ? `WhatsApp: ${phone}` : "Pesan Baru",
              description: msg.content?.substring(0, 100) || "",
              timestamp: msg.created_at,
            },
            ...prev,
          ].slice(0, MAX_LIVE_NOTIFS));
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bookings" },
        (payload) => {
          const b = payload.new;
          setLiveNotifs((prev) => [
            {
              id: b.id,
              type: "booking" as const,
              title: "Booking Baru",
              description: `${b.guest_name} - ${b.booking_code}`,
              timestamp: b.created_at,
            },
            ...prev,
          ].slice(0, MAX_LIVE_NOTIFS));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Merge live + historical
  const allNotifs: Notification[] = [
    ...liveNotifs,
    ...recentBookings.map((b: any) => ({
      id: `booking-${b.id}`,
      type: "booking" as const,
      title: `Booking: ${b.guest_name}`,
      description: `${b.booking_code} - ${b.rooms?.name || ""} (${b.status})`,
      timestamp: b.created_at,
    })),
    ...recentMessages.map((m: any) => ({
      id: `msg-${m.id}`,
      type: "whatsapp" as const,
      title: "Pesan WhatsApp",
      description: m.content?.substring(0, 80) || "",
      timestamp: m.created_at,
    })),
  ];

  // Deduplicate and sort by time desc
  const seen = new Set<string>();
  const uniqueNotifs = allNotifs.filter((n) => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return true;
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 bg-card border-b border-border">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Notifikasi
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {uniqueNotifs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Belum ada notifikasi
          </div>
        ) : (
          uniqueNotifs.slice(0, 100).map((notif) => (
            <div
              key={notif.id}
              className="px-4 py-3 border-b border-border/50 flex items-start gap-3 hover:bg-muted/30 transition-colors"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  notif.type === "whatsapp" ? "bg-green-100" : "bg-blue-100"
                }`}
              >
                {notif.type === "whatsapp" ? (
                  <MessageCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Bell className="h-4 w-4 text-blue-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{notif.title}</p>
                <p className="text-xs text-muted-foreground truncate">{notif.description}</p>
                <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(parseISO(notif.timestamp), { addSuffix: true, locale: id })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
