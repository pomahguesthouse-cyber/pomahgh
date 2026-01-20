import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/shared/useToast";

export interface PromptTemplate {
  id: string;
  title: string;
  description: string | null;
  prompt_content: string;
  category: string;
  tags: string[];
  is_favorite: boolean;
  use_count: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export type PromptTemplateInsert = Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at' | 'use_count'>;
export type PromptTemplateUpdate = Partial<PromptTemplateInsert>;

export const PROMPT_CATEGORIES = [
  { value: 'general', label: 'Umum' },
  { value: 'ui_changes', label: 'UI Changes' },
  { value: 'feature_add', label: 'Tambah Fitur' },
  { value: 'bug_fix', label: 'Bug Fix' },
  { value: 'database', label: 'Database' },
  { value: 'api', label: 'API/Backend' },
  { value: 'styling', label: 'Styling' },
  { value: 'refactor', label: 'Refactor' },
  { value: 'other', label: 'Lainnya' },
];

export function usePromptTemplates(category?: string, searchQuery?: string) {
  return useQuery({
    queryKey: ['prompt-templates', category, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('prompt_templates')
        .select('*')
        .order('is_favorite', { ascending: false })
        .order('use_count', { ascending: false })
        .order('created_at', { ascending: false });

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,prompt_content.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PromptTemplate[];
    },
  });
}

export function usePromptTemplateStats() {
  return useQuery({
    queryKey: ['prompt-templates-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prompt_templates')
        .select('id, category, is_favorite, use_count');
      
      if (error) throw error;

      const total = data.length;
      const favorites = data.filter(t => t.is_favorite).length;
      const totalUses = data.reduce((sum, t) => sum + (t.use_count || 0), 0);
      const byCategory = PROMPT_CATEGORIES.map(cat => ({
        ...cat,
        count: data.filter(t => t.category === cat.value).length
      }));

      return { total, favorites, totalUses, byCategory };
    },
  });
}

export function useAddPromptTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (template: Omit<PromptTemplateInsert, 'created_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('prompt_templates')
        .insert({
          ...template,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] });
      queryClient.invalidateQueries({ queryKey: ['prompt-templates-stats'] });
      toast({
        title: "Template disimpan",
        description: "Prompt template berhasil ditambahkan",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Gagal menyimpan template: ${error.message}`,
        variant: "destructive",
      });
    },
  });
}

export function useUpdatePromptTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & PromptTemplateUpdate) => {
      const { data, error } = await supabase
        .from('prompt_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] });
      queryClient.invalidateQueries({ queryKey: ['prompt-templates-stats'] });
      toast({
        title: "Template diperbarui",
        description: "Prompt template berhasil diupdate",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Gagal memperbarui template: ${error.message}`,
        variant: "destructive",
      });
    },
  });
}

export function useDeletePromptTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('prompt_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] });
      queryClient.invalidateQueries({ queryKey: ['prompt-templates-stats'] });
      toast({
        title: "Template dihapus",
        description: "Prompt template berhasil dihapus",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Gagal menghapus template: ${error.message}`,
        variant: "destructive",
      });
    },
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_favorite }: { id: string; is_favorite: boolean }) => {
      const { error } = await supabase
        .from('prompt_templates')
        .update({ is_favorite })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] });
      queryClient.invalidateQueries({ queryKey: ['prompt-templates-stats'] });
    },
  });
}

export function useIncrementUseCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First get current count
      const { data: current } = await supabase
        .from('prompt_templates')
        .select('use_count')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('prompt_templates')
        .update({ use_count: (current?.use_count || 0) + 1 })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] });
      queryClient.invalidateQueries({ queryKey: ['prompt-templates-stats'] });
    },
  });
}












