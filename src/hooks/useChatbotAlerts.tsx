import { useEffect, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ChatbotAlert {
  id: string;
  alert_type: "no_date_found" | "low_confidence" | "other";
  phone_number: string;
  conversation_id: string | null;
  last_user_message: string | null;
  confidence: number | null;
  intent: string | null;
  snippet: string | null;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

const ALERT_LABEL: Record<ChatbotAlert["alert_type"], string> = {
  no_date_found: "Tanggal tidak terdeteksi",
  low_confidence: "Confidence rendah",
  other: "Lainnya",
};

export function useChatbotAlerts(options?: { onlyUnresolved?: boolean }) {
  const qc = useQueryClient();
  const mountedAt = useRef<number>(Date.now());

  const query = useQuery({
    queryKey: ["chatbot-alerts", options?.onlyUnresolved ?? false],
    queryFn: async (): Promise<ChatbotAlert[]> => {
      let q = supabase
        .from("chatbot_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (options?.onlyUnresolved) q = q.eq("resolved", false);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as ChatbotAlert[];
    },
    refetchInterval: 60_000,
  });

  // Realtime: toast + refetch on new alert (only those created after mount).
  useEffect(() => {
    const channel = supabase
      .channel("chatbot-alerts-stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chatbot_alerts" },
        (payload) => {
          const row = payload.new as ChatbotAlert;
          const createdMs = new Date(row.created_at).getTime();
          if (createdMs < mountedAt.current - 2000) return;
          toast.warning(`🚨 ${ALERT_LABEL[row.alert_type]}`, {
            description: `${row.phone_number} — "${(row.last_user_message || "").slice(0, 80)}"`,
          });
          qc.invalidateQueries({ queryKey: ["chatbot-alerts"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chatbot_alerts" },
        () => qc.invalidateQueries({ queryKey: ["chatbot-alerts"] }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const resolve = useMutation({
    mutationFn: async (id: string) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("chatbot_alerts")
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: auth.user?.id ?? null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatbot-alerts"] });
      toast.success("Alert ditandai selesai");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return { ...query, resolve, ALERT_LABEL };
}