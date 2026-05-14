import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

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
  failed_responses: Array<{ user_msg: string; issue: string }>;
  successful_patterns: Array<{ trigger: string; why_worked: string }>;
  suggested_improvements: Array<{ area: string; suggestion: string; priority: string }>;
  new_slang_detected: Array<{ slang: string; meaning: string }>;
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
  top_topics: Array<{ topic: string; count: number }>;
  improvement_suggestions: Array<{ area: string; suggestion: string }>;
  recent_failures: Array<{ user_msg: string; issue: string }>;
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
// ZOD SCHEMAS
// ============================================================

const DeepAnalyzeSchema = z.object({
  analyzed: z.number(),
  insights_generated: z.number(),
});

const DetectFAQSchema = z.object({
  patterns_found: z.number(),
  new_patterns_saved: z.number(),
});

const DetectSlangSchema = z.object({
  slang_found: z.number(),
});

const PromoteFAQSchema = z.object({
  promoted: z.number(),
  auto_approved: z.number(),
});

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

async function invokeAgent<T>(
  mode: AgentMode,
  schema: z.ZodSchema<T>,
  extraParams: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await supabase.functions.invoke("whatsapp-learning-agent", {
    body: {
      mode,
      ...extraParams,
    },
  });

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  return schema.parse(data);
}

// ============================================================
// REQUEST LOCK
// ============================================================

const pendingRequests = new Set<string>();

// ============================================================
// GENERIC MUTATION FACTORY
// ============================================================

function createAgentMutation<TData, TParams = void>(
  mode: AgentMode,
  schema: z.ZodSchema<TData>,
  options?: {
    successMessage?: (data: TData) => string;
    invalidate?: string[][];
    extraParams?: Record<string, unknown>;
  },
) {
  return () => {
    const queryClient = useQueryClient();

    return useMutation<TData, Error, TParams>({
      mutationFn: async (params) => {
        if (pendingRequests.has(mode)) {
          throw new Error("Request masih berjalan");
        }

        pendingRequests.add(mode);

        try {
          return await invokeAgent<TData>(mode, schema, {
            ...options?.extraParams,
            ...(params as object),
          });
        } finally {
          pendingRequests.delete(mode);
        }
      },

      retry: false,

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

export const useDeepAnalyze = createAgentMutation("deep_analyze", DeepAnalyzeSchema, {
  successMessage: (data) => `Berhasil menganalisis ${data.analyzed} percakapan`,
  invalidate: [["conversation-insights"], ["learning-metrics"], ["learning-report"]],
});

export const useDetectFAQ = createAgentMutation("detect_faq", DetectFAQSchema, {
  successMessage: (data) => `Ditemukan ${data.patterns_found} FAQ`,
  invalidate: [["faq-patterns"], ["learning-metrics"]],
});

export const useDetectSlang = createAgentMutation("detect_slang", DetectSlangSchema, {
  successMessage: (data) =>
    data.slang_found > 0 ? `Ditemukan ${data.slang_found} slang baru` : "Tidak ada slang baru",
});

export const usePromoteFAQ = createAgentMutation("promote_faq", PromoteFAQSchema, {
  successMessage: (data) => `${data.promoted} FAQ dipromosikan`,
  invalidate: [["faq-patterns"], ["training-examples"], ["learning-metrics"]],
});

// ============================================================
// ANALYZE SINGLE
// ============================================================

type AnalyzeSingleParams = {
  conversationId: string;
};

const AnalyzeSingleSchema = z.any();

export const useAnalyzeSingle = createAgentMutation<unknown, AnalyzeSingleParams>(
  "analyze_single",
  AnalyzeSingleSchema,
  {
    successMessage: () => "Percakapan berhasil dianalisis",
    invalidate: [["conversation-insights"]],
  },
);

// ============================================================
// QUERY OPTIONS
// ============================================================

const DEFAULT_QUERY_OPTIONS = {
  staleTime: 1000 * 60,
  gcTime: 1000 * 60 * 10,
};

// ============================================================
// QUERIES
// ============================================================

export interface PaginatedResult<T> {
  rows: T[];
  total: number;
}

export const useConversationInsights = ({
  page = 0,
  pageSize = 20,
}: { page?: number; pageSize?: number } = {}) => {
  return useQuery({
    queryKey: ["conversation-insights", page, pageSize],

    queryFn: async (): Promise<PaginatedResult<ConversationInsight>> => {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
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
          { count: "exact" },
        )
        .order("analyzed_at", {
          ascending: false,
        })
        .range(from, to);

      if (error) {
        throw error;
      }

      const rows = (data ?? []).map((item) => ({
        ...item,
        summary: item.summary ?? "-",
        intent_flow: (item as { intent_flow?: string[] }).intent_flow ?? [],
        topics: item.topics ?? [],
        message_count: (item as { message_count?: number }).message_count ?? 0,
        failed_responses: [],
        successful_patterns: [],
        suggested_improvements: [],
        new_slang_detected: [],
      })) as unknown as ConversationInsight[];

      return { rows, total: count ?? 0 };
    },

    ...DEFAULT_QUERY_OPTIONS,
  });
};

export const useFAQPatterns = ({
  page = 0,
  pageSize = 20,
}: { page?: number; pageSize?: number } = {}) => {
  return useQuery({
    queryKey: ["faq-patterns", page, pageSize],

    queryFn: async (): Promise<PaginatedResult<FAQPattern>> => {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
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
          { count: "exact" },
        )
        .order("occurrence_count", {
          ascending: false,
        })
        .range(from, to);

      if (error) {
        throw error;
      }

      return { rows: (data ?? []) as FAQPattern[], total: count ?? 0 };
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

// ============================================================
// LEARNING REPORT
// ============================================================

export const useLearningReport = () => {
  return useMutation({
    mutationFn: async () => {
      return invokeAgent("learning_report", z.any());
    },

    retry: false,

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
