import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ChatConversation {
  id: string;
  session_id: string;
  guest_email: string | null;
  started_at: string | null;
  ended_at: string | null;
  message_count: number | null;
  booking_created: boolean | null;
  conversation_duration_seconds: number | null;
  fallback_count: number | null;
  satisfaction_rating: number | null;
  last_user_message: string | null;
}

export interface ChatMessage {
  id: string;
  conversation_id: string | null;
  role: string;
  content: string;
  created_at: string | null;
  ai_response: string | null;
  tool_calls_used: string[] | null;
  is_fallback: boolean | null;
}

export const useChatConversations = (page: number = 1, limit: number = 20) => {
  return useQuery({
    queryKey: ["chat-conversations", page, limit],
    queryFn: async () => {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await supabase
        .from("chat_conversations")
        .select("*", { count: "exact" })
        .order("started_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { data: data as ChatConversation[], count };
    },
  });
};

export const useChatMessages = (conversationId: string | null) => {
  return useQuery({
    queryKey: ["chat-messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!conversationId,
  });
};

export const useDeleteConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      // Delete messages first (foreign key constraint)
      const { error: messagesError } = await supabase
        .from("chat_messages")
        .delete()
        .eq("conversation_id", conversationId);

      if (messagesError) throw messagesError;

      // Delete conversation
      const { error: conversationError } = await supabase
        .from("chat_conversations")
        .delete()
        .eq("id", conversationId);

      if (conversationError) throw conversationError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      toast.success("Percakapan berhasil dihapus");
    },
    onError: (error: Error) => {
      toast.error("Gagal menghapus percakapan", {
        description: error.message,
      });
    },
  });
};

export const useChatStats = () => {
  return useQuery({
    queryKey: ["chat-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_conversations")
        .select("id, message_count, booking_created, conversation_duration_seconds, fallback_count, satisfaction_rating, started_at");

      if (error) throw error;

      const totalConversations = data.length;
      const totalMessages = data.reduce((sum, c) => sum + (c.message_count || 0), 0);
      const conversionsToBooking = data.filter(c => c.booking_created).length;
      const avgMessagesPerSession = totalConversations > 0 
        ? Math.round(totalMessages / totalConversations) 
        : 0;
      
      // Calculate new metrics
      const totalFallbacks = data.reduce((sum, c) => sum + (c.fallback_count || 0), 0);
      const fallbackRate = totalConversations > 0 
        ? Math.round((totalFallbacks / totalConversations) * 100) 
        : 0;
      
      // Calculate average duration
      const durations = data.filter(c => c.conversation_duration_seconds);
      const avgDurationSeconds = durations.length > 0
        ? Math.round(durations.reduce((sum, c) => sum + (c.conversation_duration_seconds || 0), 0) / durations.length)
        : 0;
      
      // Calculate satisfaction rating
      const ratings = data.filter(c => c.satisfaction_rating);
      const avgSatisfaction = ratings.length > 0
        ? (ratings.reduce((sum, c) => sum + (c.satisfaction_rating || 0), 0) / ratings.length).toFixed(1)
        : null;

      // Calculate peak hours (from started_at)
      const hourCounts: Record<number, number> = {};
      data.forEach(c => {
        if (c.started_at) {
          const hour = new Date(c.started_at).getHours();
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        }
      });
      const peakHour = Object.entries(hourCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || null;

      return {
        totalConversations,
        totalMessages,
        conversionsToBooking,
        avgMessagesPerSession,
        totalFallbacks,
        fallbackRate,
        avgDurationSeconds,
        avgSatisfaction: avgSatisfaction ? parseFloat(avgSatisfaction) : null,
        peakHour: peakHour ? parseInt(peakHour) : null,
      };
    },
  });
};

export const useUpdateConversationStats = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      conversationId, 
      durationSeconds,
      fallbackCount,
      lastMessage 
    }: { 
      conversationId: string;
      durationSeconds?: number;
      fallbackCount?: number;
      lastMessage?: string;
    }) => {
      const updates: Record<string, unknown> = {};
      
      if (durationSeconds !== undefined) {
        updates.conversation_duration_seconds = durationSeconds;
        updates.ended_at = new Date().toISOString();
      }
      if (fallbackCount !== undefined) {
        updates.fallback_count = fallbackCount;
      }
      if (lastMessage !== undefined) {
        updates.last_user_message = lastMessage;
      }

      const { error } = await supabase
        .from("chat_conversations")
        .update(updates)
        .eq("id", conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["chat-stats"] });
    },
  });
};

export const useRateConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, rating }: { conversationId: string; rating: number }) => {
      const { error } = await supabase
        .from("chat_conversations")
        .update({ satisfaction_rating: rating })
        .eq("id", conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["chat-stats"] });
      toast.success("Rating berhasil disimpan");
    },
    onError: (error: Error) => {
      toast.error("Gagal menyimpan rating", { description: error.message });
    },
  });
};

export const useUpdateConversationEmail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, email }: { conversationId: string; email: string }) => {
      const { error } = await supabase
        .from("chat_conversations")
        .update({ guest_email: email })
        .eq("id", conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    },
  });
};
