import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ============================================================
// Types
// ============================================================
export interface ConversationInsight {
  id: string;
  conversation_id: string;
  session_id: string | null;
  summary: string | null;
  topics: string[];
  sentiment: "positive" | "neutral" | "negative" | "mixed";
  intent_flow: string[];
  resolution_status: "resolved" | "unresolved" | "escalated" | "abandoned";
  bot_accuracy_score: number | null;
  guest_satisfaction_signal: string | null;
  common_questions: Array<{ question: string; category?: string }>;
  failed_responses: Array<{ user_msg: string; bot_response: string; issue: string }>;
  successful_patterns: Array<{ trigger: string; response_style: string; why_worked: string }>;
  suggested_improvements: Array<{ area: string; suggestion: string; priority: string }>;
  new_slang_detected: Array<{ slang: string; meaning: string; context: string }>;
  message_count: number;
  analyzed_at: string;
  created_at: string;
}

export interface FAQPattern {
  id: string;
  pattern_text: string;
  canonical_question: string;
  category: string;
  occurrence_count: number;
  last_seen_at: string;
  best_response: string | null;
  response_quality_score: number | null;
  is_promoted_to_training: boolean;
  training_example_id: string | null;
  created_at: string;
}

export interface LearningMetric {
  id: string;
  run_date: string;
  conversations_analyzed: number;
  messages_processed: number;
  insights_generated: number;
  faq_patterns_found: number;
  training_examples_created: number;
  slang_patterns_detected: number;
  improvements_suggested: number;
  created_at: string;
}

export interface LearningReport {
  summary: {
    total_conversations_analyzed: number;
    avg_bot_accuracy: number;
    total_faq_patterns: number;
    total_training_from_wa: number;
    pending_approval: number;
  };
  sentiment_distribution: Record<string, number>;
  resolution_distribution: Record<string, number>;
  top_topics: Array<{ topic: string; count: number }>;
  top_faq_patterns: Array<{
    question: string;
    category: string;
    occurrence_count: number;
    has_response: boolean;
    promoted: boolean;
  }>;
  recent_failures: Array<{ user_msg: string; issue: string }>;
  improvement_suggestions: Array<{ area: string; suggestion: string }>;
  weekly_metrics: Array<{
    date: string;
    conversations: number;
    insights: number;
    faq_found: number;
    training_created: number;
  }>;
}

// ============================================================
// Agent Invocation Hooks
// ============================================================

async function invokeAgent(mode: string, extraParams: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("whatsapp-learning-agent", {
    body: { mode, ...extraParams },
  });
  if (error) throw error;
  return data;
}

/** Deep analyze unanalyzed WhatsApp conversations */
export const useDeepAnalyze = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (limit?: number) => invokeAgent("deep_analyze", { limit: limit || 20 }),
    onSuccess: (data) => {
      toast.success(`Berhasil menganalisis ${data.analyzed} percakapan, ${data.insights_generated} insight dibuat`);
      queryClient.invalidateQueries({ queryKey: ["conversation-insights"] });
      queryClient.invalidateQueries({ queryKey: ["learning-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["learning-report"] });
    },
    onError: (err: Error) => {
      toast.error(`Gagal analisis: ${err.message}`);
    },
  });
};

/** Detect FAQ patterns from insights */
export const useDetectFAQ = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => invokeAgent("detect_faq"),
    onSuccess: (data) => {
      toast.success(`Ditemukan ${data.patterns_found} pola FAQ, ${data.new_patterns_saved} baru disimpan`);
      queryClient.invalidateQueries({ queryKey: ["faq-patterns"] });
      queryClient.invalidateQueries({ queryKey: ["learning-metrics"] });
    },
    onError: (err: Error) => {
      toast.error(`Gagal deteksi FAQ: ${err.message}`);
    },
  });
};

/** Detect new slang from conversations */
export const useDetectSlang = () => {
  return useMutation({
    mutationFn: () => invokeAgent("detect_slang"),
    onSuccess: (data) => {
      if (data.slang_found > 0) {
        toast.success(`Ditemukan ${data.slang_found} slang/singkatan baru`);
      } else {
        toast.info("Tidak ada slang baru terdeteksi");
      }
    },
    onError: (err: Error) => {
      toast.error(`Gagal deteksi slang: ${err.message}`);
    },
  });
};

/** Promote top FAQ patterns to training examples */
export const usePromoteFAQ = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => invokeAgent("promote_faq"),
    onSuccess: (data) => {
      toast.success(`${data.promoted} FAQ dipromosikan ke training`);
      queryClient.invalidateQueries({ queryKey: ["faq-patterns"] });
      queryClient.invalidateQueries({ queryKey: ["training-examples"] });
      queryClient.invalidateQueries({ queryKey: ["learning-metrics"] });
    },
    onError: (err: Error) => {
      toast.error(`Gagal promosi FAQ: ${err.message}`);
    },
  });
};

/** Analyze a single conversation */
export const useAnalyzeSingle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) =>
      invokeAgent("analyze_single", { conversation_id: conversationId }),
    onSuccess: (data) => {
      toast.success("Percakapan berhasil dianalisis");
      queryClient.invalidateQueries({ queryKey: ["conversation-insights"] });
    },
    onError: (err: Error) => {
      toast.error(`Gagal analisis: ${err.message}`);
    },
  });
};

// ============================================================
// Data Query Hooks
// ============================================================

/** Get conversation insights */
export const useConversationInsights = (limit = 50) => {
  return useQuery({
    queryKey: ["conversation-insights", limit],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("whatsapp_conversation_insights" as any)
        .select("*")
        .order("analyzed_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data as unknown) as ConversationInsight[];
    },
  });
};

/** Get FAQ patterns */
export const useFAQPatterns = () => {
  return useQuery({
    queryKey: ["faq-patterns"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("whatsapp_faq_patterns" as any)
        .select("*")
        .order("occurrence_count", { ascending: false });
      if (error) throw error;
      return (data as unknown) as FAQPattern[];
    },
  });
};

/** Get learning metrics */
export const useLearningMetrics = (days = 7) => {
  return useQuery({
    queryKey: ["learning-metrics", days],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_learning_metrics")
        .select("*")
        .order("run_date", { ascending: false })
        .limit(days);
      if (error) throw error;
      return (data as unknown) as LearningMetric[];
    },
  });
};

/** Get full learning report */
export const useLearningReport = () => {
  return useMutation({
    mutationFn: () => invokeAgent("learning_report"),
  });
};

/** Delete an FAQ pattern */
export const useDeleteFAQPattern = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("whatsapp_faq_patterns")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faq-patterns"] });
      toast.success("FAQ pattern dihapus");
    },
  });
};
