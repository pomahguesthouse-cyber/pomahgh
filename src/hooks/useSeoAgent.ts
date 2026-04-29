import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type SeoKeyword = {
  id: string;
  keyword: string;
  normalized_keyword: string;
  source: string;
  status: string;
  intent_category: string | null;
  intent_score: number | null;
  intent_reasoning: string | null;
  rejection_reason: string | null;
  seed_keyword: string | null;
  search_volume_estimate: number | null;
  attraction_id: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SeoAgentSettings = {
  id: string;
  seed_keywords: string[];
  target_intents: string[];
  intent_threshold: number;
  article_min_words: number;
  article_tone: string;
  daily_generate_limit: number;
  auto_publish: boolean;
  model_classifier: string;
  model_text: string;
  model_image: string;
  internal_link_targets: string[];
  disclaimer_footer: string;
};

export type SeoAgentRun = {
  id: string;
  step: string;
  status: string;
  keyword_id: string | null;
  attraction_id: string | null;
  model_used: string | null;
  word_count: number | null;
  keyword_density: number | null;
  readability_score: number | null;
  seo_score: number | null;
  issues: unknown;
  payload: unknown;
  error_message: string | null;
  duration_ms: number | null;
  cost_estimate: number | null;
  tokens_used: number | null;
  created_at: string;
};

export type SeoDraft = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  long_description: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  agent_keyword_id: string | null;
};

export const useSeoAgentSettings = () => {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["seo-agent-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_agent_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as SeoAgentSettings | null;
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<SeoAgentSettings>) => {
      if (!query.data?.id) throw new Error("Settings not loaded");
      const { error } = await supabase
        .from("seo_agent_settings")
        .update(patch)
        .eq("id", query.data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seo-agent-settings"] });
      toast.success("Pengaturan disimpan");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { ...query, update };
};

export const useSeoKeywords = (status?: string) => {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["seo-keywords", status ?? "all"],
    queryFn: async () => {
      let q = supabase.from("seo_keywords").select("*").order("created_at", { ascending: false }).limit(500);
      if (status && status !== "all") q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SeoKeyword[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("seo_keywords").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seo-keywords"] });
      toast.success("Status keyword diperbarui");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("seo_keywords").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seo-keywords"] });
      toast.success("Keyword dihapus");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { ...query, updateStatus, remove };
};

export const useSeoAgentRuns = () => {
  return useQuery({
    queryKey: ["seo-agent-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_agent_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as SeoAgentRun[];
    },
  });
};

export const useSeoDrafts = () => {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["seo-drafts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("city_attractions")
        .select("id,name,slug,description,long_description,image_url,is_active,created_at,agent_keyword_id")
        .eq("created_by_agent", true)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as SeoDraft[];
    },
  });

  const setActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("city_attractions").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seo-drafts"] });
      toast.success("Status draft diperbarui");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("city_attractions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seo-drafts"] });
      toast.success("Draft dihapus");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { ...query, setActive, remove };
};

export const invokeSeoAgent = async (
  fn: "seo-agent-keywords" | "seo-agent-classify" | "seo-agent-generate",
  body: Record<string, unknown> = {},
) => {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) throw new Error(error.message);
  return data;
};