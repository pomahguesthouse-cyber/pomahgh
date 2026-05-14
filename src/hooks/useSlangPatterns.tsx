import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export interface SlangPattern {
  id: string;
  slang: string;
  normalized: string;
  is_active: boolean;
  source: "manual" | "detected" | "seed";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedSlang {
  rows: SlangPattern[];
  total: number;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Unknown error";
}

export const useSlangPatterns = ({
  page = 0,
  pageSize = 20,
  search = "",
}: { page?: number; pageSize?: number; search?: string } = {}) => {
  return useQuery({
    queryKey: ["slang-patterns", page, pageSize, search],
    queryFn: async (): Promise<PaginatedSlang> => {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      let query = supabase
        .from("whatsapp_slang_patterns")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.or(`slang.ilike.${term},normalized.ilike.${term}`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: (data ?? []) as SlangPattern[], total: count ?? 0 };
    },
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
  });
};

export interface UpsertSlangInput {
  id?: string;
  slang: string;
  normalized: string;
  is_active?: boolean;
  source?: "manual" | "detected";
  notes?: string | null;
}

export const useUpsertSlangPattern = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpsertSlangInput) => {
      const payload = {
        slang: input.slang.trim().toLowerCase(),
        normalized: input.normalized.trim(),
        is_active: input.is_active ?? true,
        source: input.source ?? "manual",
        notes: input.notes ?? null,
      };

      if (input.id) {
        const { error } = await supabase
          .from("whatsapp_slang_patterns")
          .update(payload)
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("whatsapp_slang_patterns")
          .upsert(payload, { onConflict: "slang" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slang-patterns"] });
      toast.success("Slang tersimpan");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
};

export const useToggleSlangActive = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("whatsapp_slang_patterns")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slang-patterns"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
};

export const useDeleteSlangPattern = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("whatsapp_slang_patterns")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slang-patterns"] });
      toast.success("Slang dihapus");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
};
