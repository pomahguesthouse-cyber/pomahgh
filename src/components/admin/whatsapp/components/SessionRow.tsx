import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const PAGE_SIZE = 10;

interface Params {
  conversationId: string;
  page: number;
}

export const useWhatsAppSessionMessages = ({ conversationId, page }: Params) => {
  return useQuery({
    queryKey: ["sessionMessages", conversationId, page],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      // dibalik supaya tampil kronologis
      return data.reverse();
    },
    enabled: !!conversationId,
    keepPreviousData: true,
  });
};
