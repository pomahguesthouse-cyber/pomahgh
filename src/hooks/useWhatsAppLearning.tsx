import { useQuery, useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ============================================================
// TYPES
// ============================================================

export type AgentMode =
  | "deep_analyze"
  | "detect_faq"
  | "detect_slang"
  | "promote_faq"
  | "analyze_single"
  | "learning_report";

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
  best_response: string | null;
  response_quality_score: number | null;
  is_promoted_to_training: boolean;
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
}

// ============================================================
// ERROR HANDLER
// ============================================================

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    return String(error.message);
  }

  return "Unknown error";
}

// ============================================================
// AGENT INVOKER
// ============================================================

async function invokeAgent<T>(mode: AgentMode, extraParams: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("whatsapp-learning-agent", {
    body: {
      mode,
      ...extraParams,
    },
  });

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  return data as T;
}

// ============================================================
// GENERIC MUTATION FACTORY
// ============================================================

function createAgentMutation<TData>(
  mode: AgentMode,
  options?: {
    successMessage?: (data: TData) => string;
    invalidate?: string[][];
    extraParams?: Record<string, unknown>;
  },
) {
  return () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (params?: Record<string, unknown>) => {
        return invokeAgent<TData>(mode, {
          ...options?.extraParams,
          ...params,
        });
      },

      onSuccess: (data) => {
        if (options?.successMessage) {
          toast.success(options.successMessage(data));
        }

        options?.invalidate?.forEach((key) => {
          queryClient.invalidateQueries({
            queryKey: key,
          });
        });
      },

      onError: (error) => {
        toast.error(getErrorMessage(error));
      },
    });
  };
}

// ============================================================
// MUTATIONS
// ============================================================

export const useDeepAnalyze = createAgentMutation<{
  analyzed: number;
  insights_generated: number;
}>("deep_analyze", {
  successMessage: (data) => `Berhasil menganalisis ${data.analyzed} percakapan`,
  invalidate: [["conversation-insights"], ["learning-metrics"], ["learning-report"]],
});

export const useDetectFAQ = createAgentMutation<{
  patterns_found: number;
  new_patterns_saved: number;
}>("detect_faq", {
  successMessage: (data) => `Ditemukan ${data.patterns_found} FAQ`,
  invalidate: [["faq-patterns"], ["learning-metrics"]],
});

export const useDetectSlang = createAgentMutation<{
  slang_found: number;
}>("detect_slang", {
  successMessage: (data) =>
    data.slang_found > 0 ? `Ditemukan ${data.slang_found} slang baru` : "Tidak ada slang baru",
});

export const usePromoteFAQ = createAgentMutation<{
  promoted: number;
  auto_approved: number;
}>("promote_faq", {
  successMessage: (data) => `${data.promoted} FAQ dipromosikan`,
  invalidate: [["faq-patterns"], ["training-examples"], ["learning-metrics"]],
});

export const useAnalyzeSingle = createAgentMutation("analyze_single", {
  successMessage: () => "Percakapan berhasil dianalisis",
  invalidate: [["conversation-insights"]],
});

// ============================================================
// QUERY OPTIONS
// ============================================================

const DEFAULT_QUERY_OPTIONS = {
  staleTime: 1000 * 60,
  gcTime: 1000 * 60 * 10,
  retry: 2,
};

// ============================================================
// QUERIES
// ============================================================

export const useConversationInsights = (limit = 50) => {
  return useQuery({
    queryKey: ["conversation-insights", limit],

    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_conversation_insights")
        .select(
          `
            id,
            conversation_id,
            summary,
            sentiment,
            topics,
            resolution_status,
            bot_accuracy_score,
            analyzed_at
          `,
        )
        .order("analyzed_at", {
          ascending: false,
        })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data as ConversationInsight[];
    },

    ...DEFAULT_QUERY_OPTIONS,
  });
};

export const useFAQPatterns = () => {
  return useQuery({
    queryKey: ["faq-patterns"],

    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_faq_patterns")
        .select(
          `
            id,
            pattern_text,
            category,
            occurrence_count,
            best_response,
            is_promoted_to_training
          `,
        )
        .order("occurrence_count", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      return data as FAQPattern[];
    },

    ...DEFAULT_QUERY_OPTIONS,
  });
};

export const useLearningMetrics = (days = 7) => {
  return useQuery({
    queryKey: ["learning-metrics", days],

    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_learning_metrics")
        .select("*")
        .order("run_date", {
          ascending: false,
        })
        .limit(days);

      if (error) {
        throw error;
      }

      return data as LearningMetric[];
    },

    ...DEFAULT_QUERY_OPTIONS,
  });
};

export const useLearningReport = () => {
  return useMutation({
    mutationFn: () => invokeAgent("learning_report"),

    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

// ============================================================
// DELETE FAQ
// ============================================================

export const useDeleteFAQPattern = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whatsapp_faq_patterns").delete().eq("id", id);

      if (error) {
        throw error;
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["faq-patterns"],
      });

      toast.success("FAQ pattern dihapus");
    },

    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};
