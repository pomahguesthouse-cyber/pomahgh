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
}

export interface ChatMessage {
  id: string;
  conversation_id: string | null;
  role: string;
  content: string;
  created_at: string | null;
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
        .select("id, message_count, booking_created");

      if (error) throw error;

      const totalConversations = data.length;
      const totalMessages = data.reduce((sum, c) => sum + (c.message_count || 0), 0);
      const conversionsToBooking = data.filter(c => c.booking_created).length;
      const avgMessagesPerSession = totalConversations > 0 
        ? Math.round(totalMessages / totalConversations) 
        : 0;

      return {
        totalConversations,
        totalMessages,
        conversionsToBooking,
        avgMessagesPerSession,
      };
    },
  });
};
