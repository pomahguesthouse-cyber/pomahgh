import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WhatsAppSession {
  id: string;
  phone_number: string;
  guest_name: string | null;
  conversation_id: string | null;
  last_message_at: string | null;
  context: Record<string, unknown> | null;
  is_active: boolean | null;
  is_blocked: boolean | null;
  is_takeover: boolean | null;
  takeover_by: string | null;
  takeover_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface WhatsAppSessionWithMessages extends WhatsAppSession {
  chat_conversations: {
    id: string;
    message_count: number | null;
    booking_created: boolean | null;
    started_at: string | null;
    ended_at: string | null;
  } | null;
}

// --- Shared helpers untuk sinkronisasi cache antar panel ---------------------
// LiveChatView (multi-agent dashboard) memakai query key 'multi-agent-sessions',
// sedangkan tab WhatsApp Sessions memakai 'whatsapp-sessions'. Setiap mutasi
// takeover/release HARUS menyentuh kedua cache itu supaya UI berubah tanpa
// perlu refresh halaman.
const SESSION_LIST_KEYS = [
  ["whatsapp-sessions"],
  ["whatsapp-stats"],
  ["multi-agent-sessions"],
  ["multi-agent-stats"],
] as const;

function invalidateSessionLists(qc: QueryClient) {
  SESSION_LIST_KEYS.forEach((key) => {
    qc.invalidateQueries({ queryKey: key });
  });
}

function patchSessionInCaches(qc: QueryClient, sessionId: string, patch: Record<string, unknown>) {
  const updater = (old: unknown) => {
    if (!Array.isArray(old)) return old;
    return old.map((s) => {
      if (s && typeof s === "object" && (s as { id?: string }).id === sessionId) {
        return { ...s, ...patch };
      }
      return s;
    });
  };
  SESSION_LIST_KEYS.forEach((key) => {
    qc.setQueryData(key, updater);
  });
}

// ----------------------------------------------------------------------------

export const useWhatsAppSessions = (sessionType?: "guest" | "admin" | "all") => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const sessionsChannel = supabase
      .channel(`whatsapp-sessions-realtime-${sessionType || "all"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_sessions" }, () => {
        queryClient.invalidateQueries({ queryKey: ["whatsapp-sessions", sessionType] });
        queryClient.invalidateQueries({ queryKey: ["whatsapp-stats", sessionType] });
        queryClient.invalidateQueries({ queryKey: ["multi-agent-sessions"] });
        queryClient.invalidateQueries({ queryKey: ["multi-agent-stats"] });
      })
      .subscribe();

    const messagesChannel = supabase
      .channel(`whatsapp-messages-realtime-${sessionType || "all"}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
        if (payload.new && typeof payload.new === "object" && "conversation_id" in payload.new) {
          queryClient.invalidateQueries({
            queryKey: ["whatsapp-session-messages", payload.new.conversation_id],
          });
        }
        queryClient.invalidateQueries({ queryKey: ["whatsapp-sessions", sessionType] });
        queryClient.invalidateQueries({ queryKey: ["whatsapp-stats", sessionType] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sessionsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [queryClient, sessionType]);

  return useQuery({
    queryKey: ["whatsapp-sessions", sessionType],
    queryFn: async () => {
      let query = supabase
        .from("whatsapp_sessions")
        .select(
          `
          *,
          chat_conversations (
            id,
            message_count,
            booking_created,
            started_at,
            ended_at
          )
        `,
        )
        .order("last_message_at", { ascending: false });

      if (sessionType && sessionType !== "all") {
        query = query.eq("session_type", sessionType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as WhatsAppSessionWithMessages[];
    },
  });
};

export const useWhatsAppSessionMessages = (conversationId: string | null) => {
  return useQuery({
    queryKey: ["whatsapp-session-messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
  });
};

export const useToggleBlockSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isBlocked }: { id: string; isBlocked: boolean }) => {
      const { error } = await supabase
        .from("whatsapp_sessions")
        .update({ is_blocked: isBlocked, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { isBlocked }) => {
      invalidateSessionLists(queryClient);
      toast.success(isBlocked ? "Nomor diblokir" : "Nomor dibuka blokir");
    },
    onError: () => {
      toast.error("Gagal mengubah status blokir");
    },
  });
};

export const useDeleteWhatsAppSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whatsapp_sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateSessionLists(queryClient);
      toast.success("Session dihapus");
    },
    onError: () => {
      toast.error("Gagal menghapus session");
    },
  });
};

export const useTakeoverSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: session } = await supabase
        .from("whatsapp_sessions")
        .select("conversation_id")
        .eq("id", sessionId)
        .maybeSingle();

      const { error } = await supabase
        .from("whatsapp_sessions")
        .update({
          is_takeover: true,
          takeover_by: user?.id,
          takeover_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (error) throw error;

      if (session?.conversation_id) {
        await supabase.from("chat_messages").insert({
          conversation_id: session.conversation_id,
          role: "assistant",
          content: "[System] Admin mengambil alih percakapan. AI dihentikan sementara.",
        });
      }

      return { conversationId: session?.conversation_id ?? null };
    },
    // OPTIMISTIC: tombol langsung berubah jadi "Kembalikan ke AI" tanpa nunggu network
    onMutate: async (sessionId: string) => {
      await Promise.all(SESSION_LIST_KEYS.map((key) => queryClient.cancelQueries({ queryKey: key })));
      const snapshot = SESSION_LIST_KEYS.map((key) => ({
        key,
        data: queryClient.getQueryData(key),
      }));
      patchSessionInCaches(queryClient, sessionId, {
        is_takeover: true,
        takeover_at: new Date().toISOString(),
      });
      return { snapshot };
    },
    onError: (_err, _sessionId, ctx) => {
      ctx?.snapshot?.forEach(({ key, data }) => queryClient.setQueryData(key, data));
      toast.error("Gagal mengambil alih percakapan");
    },
    onSuccess: (data) => {
      if (data?.conversationId) {
        queryClient.invalidateQueries({
          queryKey: ["whatsapp-session-messages", data.conversationId],
        });
      }
      toast.success("Percakapan diambil alih");
    },
    onSettled: () => {
      invalidateSessionLists(queryClient);
    },
  });
};

export const useReleaseSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data: session } = await supabase
        .from("whatsapp_sessions")
        .select("conversation_id")
        .eq("id", sessionId)
        .maybeSingle();

      const { error } = await supabase
        .from("whatsapp_sessions")
        .update({
          is_takeover: false,
          takeover_by: null,
          takeover_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (error) throw error;

      if (session?.conversation_id) {
        await supabase.from("chat_messages").insert({
          conversation_id: session.conversation_id,
          role: "assistant",
          content:
            "[System] Percakapan dikembalikan ke AI. Lanjutkan membantu tamu berdasarkan konteks percakapan sebelumnya termasuk balasan dari admin.",
        });
      }

      return { conversationId: session?.conversation_id ?? null };
    },
    // OPTIMISTIC: tombol langsung kembali ke "Ambil Alih"
    onMutate: async (sessionId: string) => {
      await Promise.all(SESSION_LIST_KEYS.map((key) => queryClient.cancelQueries({ queryKey: key })));
      const snapshot = SESSION_LIST_KEYS.map((key) => ({
        key,
        data: queryClient.getQueryData(key),
      }));
      patchSessionInCaches(queryClient, sessionId, {
        is_takeover: false,
        takeover_by: null,
        takeover_at: null,
      });
      return { snapshot };
    },
    onError: (_err, _sessionId, ctx) => {
      ctx?.snapshot?.forEach(({ key, data }) => queryClient.setQueryData(key, data));
      toast.error("Gagal mengembalikan percakapan");
    },
    onSuccess: (data) => {
      if (data?.conversationId) {
        queryClient.invalidateQueries({
          queryKey: ["whatsapp-session-messages", data.conversationId],
        });
      }
      toast.success("Percakapan dikembalikan ke AI");
    },
    onSettled: () => {
      invalidateSessionLists(queryClient);
    },
  });
};

export const useSendAdminMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      phoneNumber,
      message,
      conversationId,
      sessionId,
    }: {
      phoneNumber: string;
      message: string;
      conversationId: string | null;
      sessionId?: string | null;
    }) => {
      // Auto-takeover: kalau admin mulai mengirim manual, otomatis pause AI
      if (sessionId) {
        const { data: sess } = await supabase
          .from("whatsapp_sessions")
          .select("is_takeover")
          .eq("id", sessionId)
          .maybeSingle();
        if (sess && !sess.is_takeover) {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          await supabase
            .from("whatsapp_sessions")
            .update({
              is_takeover: true,
              takeover_by: user?.id,
              takeover_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", sessionId);
          // Optimistic: ubah cache supaya tombol di UI langsung "Kembalikan ke AI"
          patchSessionInCaches(queryClient, sessionId, {
            is_takeover: true,
            takeover_at: new Date().toISOString(),
          });
          if (conversationId) {
            await supabase.from("chat_messages").insert({
              conversation_id: conversationId,
              role: "assistant",
              content: "[System] Admin mulai membalas — AI dihentikan otomatis.",
            });
          }
        }
      }

      throw new Error("WhatsApp send not available — Fonnte integration removed");
    },
    onSuccess: (_data, vars) => {
      invalidateSessionLists(queryClient);
      queryClient.invalidateQueries({ queryKey: ["whatsapp-session-messages"] });
      if (vars.conversationId) {
        queryClient.invalidateQueries({
          queryKey: ["whatsapp-session-messages", vars.conversationId],
        });
      }
      toast.success("Pesan terkirim");
    },
    onError: (error) => {
      console.error("Send error:", error);
      toast.error("Gagal mengirim pesan");
    },
  });
};

export const useWhatsAppStats = (sessionType?: "guest" | "admin" | "all") => {
  return useQuery({
    queryKey: ["whatsapp-stats", sessionType],
    queryFn: async () => {
      let query = supabase
        .from("whatsapp_sessions")
        .select("id, is_blocked, is_active, is_takeover, conversation_id, session_type");

      if (sessionType && sessionType !== "all") {
        query = query.eq("session_type", sessionType);
      }

      const { data: sessions, error: sessionsError } = await query;
      if (sessionsError) throw sessionsError;

      const { data: conversations, error: convError } = await supabase
        .from("chat_conversations")
        .select("id, message_count, booking_created")
        .in(
          "id",
          (sessions?.filter((s) => s.conversation_id).map((s) => s.conversation_id) || []).filter(
            (id): id is string => id !== null,
          ),
        );

      if (convError) throw convError;

      const totalSessions = sessions?.length || 0;
      const activeSessions = sessions?.filter((s) => s.is_active && !s.is_blocked).length || 0;
      const blockedSessions = sessions?.filter((s) => s.is_blocked).length || 0;
      const takeoverSessions = sessions?.filter((s) => s.is_takeover).length || 0;
      const totalMessages = conversations?.reduce((sum, c) => sum + (c.message_count || 0), 0) || 0;
      const bookingsCreated = conversations?.filter((c) => c.booking_created).length || 0;

      return {
        totalSessions,
        activeSessions,
        blockedSessions,
        takeoverSessions,
        totalMessages,
        bookingsCreated,
        conversionRate: totalSessions > 0 ? ((bookingsCreated / totalSessions) * 100).toFixed(1) : "0",
      };
    },
  });
};
