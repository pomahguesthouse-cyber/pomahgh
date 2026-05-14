import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export interface TesterScenario {
  id: string;
  name: string;
  description: string | null;
  category: string;
  steps: Array<{ user_message: string; expected_assertions?: string[] }>;
  expected_final_outcome: string | null;
  is_active: boolean;
  created_at: string;
}

export interface TesterRun {
  id: string;
  scenario_id: string | null;
  mode: "scenario" | "live" | "replay";
  source_conversation_id: string | null;
  test_phone: string;
  test_conversation_id: string | null;
  status: "running" | "passed" | "failed" | "error";
  overall_score: number | null;
  accuracy_score: number | null;
  tone_score: number | null;
  escalation_score: number | null;
  summary: string | null;
  recommendations: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface TesterMessage {
  id: string;
  run_id: string;
  step_index: number;
  role: "user" | "bot" | "system";
  content: string;
  assertions: Array<{ name: string; passed: boolean; reason?: string }>;
  latency_ms: number | null;
  created_at: string;
}

/* ---------- Scenarios ---------- */
export const useScenarios = () =>
  useQuery({
    queryKey: ["tester-scenarios"],
    queryFn: async (): Promise<TesterScenario[]> => {
      const { data, error } = await supabase
        .from("chat_test_scenarios")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TesterScenario[];
    },
  });

export const useUpsertScenario = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<TesterScenario> & { name: string; steps: TesterScenario["steps"] }) => {
      if (input.id) {
        const { error } = await supabase
          .from("chat_test_scenarios")
          .update({
            name: input.name,
            description: input.description ?? null,
            category: input.category ?? "booking_normal",
            steps: input.steps,
            expected_final_outcome: input.expected_final_outcome ?? null,
          })
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("chat_test_scenarios").insert({
          name: input.name,
          description: input.description ?? null,
          category: input.category ?? "booking_normal",
          steps: input.steps,
          expected_final_outcome: input.expected_final_outcome ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tester-scenarios"] });
      toast.success("Skenario tersimpan");
    },
    onError: (e) => toast.error((e as Error).message),
  });
};

export const useDeleteScenario = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chat_test_scenarios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tester-scenarios"] });
      toast.success("Skenario dihapus");
    },
    onError: (e) => toast.error((e as Error).message),
  });
};

/* ---------- Runs ---------- */
export const useRuns = () =>
  useQuery({
    queryKey: ["tester-runs"],
    queryFn: async (): Promise<TesterRun[]> => {
      const { data, error } = await supabase
        .from("chat_test_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as TesterRun[];
    },
  });

export const useRunDetail = (runId: string | undefined) =>
  useQuery({
    queryKey: ["tester-run-detail", runId],
    enabled: !!runId,
    queryFn: async (): Promise<{ run: TesterRun; messages: TesterMessage[] }> => {
      const [{ data: run }, { data: msgs }] = await Promise.all([
        supabase.from("chat_test_runs").select("*").eq("id", runId!).maybeSingle(),
        supabase
          .from("chat_test_messages")
          .select("*")
          .eq("run_id", runId!)
          .order("step_index", { ascending: true })
          .order("created_at", { ascending: true }),
      ]);
      if (!run) throw new Error("run not found");
      return {
        run: run as unknown as TesterRun,
        messages: (msgs ?? []) as unknown as TesterMessage[],
      };
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.run?.status === "running" ? 2000 : false;
    },
  });

/* ---------- Runner actions ---------- */
async function callRunner<T = unknown>(action: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(`chatbot-test-runner?action=${action}`, {
    body,
  });
  if (error) throw error;
  return data as T;
}

export const useStartScenario = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (scenarioId: string) => {
      return await callRunner<{ run_id: string }>("start_scenario", { scenario_id: scenarioId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tester-runs"] });
    },
    onError: (e) => toast.error("Gagal menjalankan skenario: " + (e as Error).message),
  });
};

export const useLiveStep = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ runId, message }: { runId?: string; message: string }) => {
      return await callRunner<{ run_id: string; last_reply: string | null }>("live_step", {
        run_id: runId,
        message,
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["tester-run-detail", vars.runId] });
      qc.invalidateQueries({ queryKey: ["tester-runs"] });
    },
    onError: (e) => toast.error("Gagal kirim: " + (e as Error).message),
  });
};

export const useStartReplay = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sourceConversationId: string) => {
      return await callRunner<{ run_id: string }>("start_replay", {
        source_conversation_id: sourceConversationId,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tester-runs"] });
    },
    onError: (e) => toast.error("Gagal replay: " + (e as Error).message),
  });
};

/* ---------- Conversation list (for replay picker) ---------- */
export const useRecentConversations = () =>
  useQuery({
    queryKey: ["tester-recent-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_conversations")
        .select("id, session_id, started_at, message_count")
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });