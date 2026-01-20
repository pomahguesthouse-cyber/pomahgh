import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CodeSnippet {
  id: string;
  title: string;
  description: string | null;
  code_content: string;
  language: string;
  category: string;
  tags: string[];
  is_favorite: boolean;
  use_count: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export type CodeSnippetInsert = Omit<CodeSnippet, 'id' | 'created_at' | 'updated_at' | 'use_count'>;
export type CodeSnippetUpdate = Partial<CodeSnippetInsert>;

export const CODE_LANGUAGES = [
  { value: 'typescript', label: 'TypeScript', color: 'bg-blue-500' },
  { value: 'tsx', label: 'React TSX', color: 'bg-cyan-500' },
  { value: 'javascript', label: 'JavaScript', color: 'bg-yellow-500' },
  { value: 'jsx', label: 'React JSX', color: 'bg-orange-500' },
  { value: 'sql', label: 'SQL', color: 'bg-purple-500' },
  { value: 'css', label: 'CSS', color: 'bg-pink-500' },
  { value: 'html', label: 'HTML', color: 'bg-red-500' },
  { value: 'json', label: 'JSON', color: 'bg-green-500' },
  { value: 'bash', label: 'Bash/Shell', color: 'bg-gray-500' },
];

export const SNIPPET_CATEGORIES = [
  { value: 'component', label: 'Components' },
  { value: 'hook', label: 'Hooks' },
  { value: 'utility', label: 'Utilities' },
  { value: 'api', label: 'API/Backend' },
  { value: 'database', label: 'Database/SQL' },
  { value: 'styling', label: 'Styling' },
  { value: 'config', label: 'Configuration' },
  { value: 'other', label: 'Lainnya' },
];

export function useCodeSnippets(language?: string, category?: string, searchQuery?: string) {
  return useQuery({
    queryKey: ['code-snippets', language, category, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('code_snippets')
        .select('*')
        .order('is_favorite', { ascending: false })
        .order('use_count', { ascending: false })
        .order('created_at', { ascending: false });

      if (language && language !== 'all') {
        query = query.eq('language', language);
      }

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,code_content.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CodeSnippet[];
    },
  });
}

export function useCodeSnippetStats() {
  return useQuery({
    queryKey: ['code-snippets-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('code_snippets')
        .select('id, language, category, is_favorite, use_count');
      
      if (error) throw error;

      const total = data.length;
      const favorites = data.filter(s => s.is_favorite).length;
      const totalUses = data.reduce((sum, s) => sum + (s.use_count || 0), 0);
      const byLanguage = CODE_LANGUAGES.map(lang => ({
        ...lang,
        count: data.filter(s => s.language === lang.value).length
      }));
      const byCategory = SNIPPET_CATEGORIES.map(cat => ({
        ...cat,
        count: data.filter(s => s.category === cat.value).length
      }));

      return { total, favorites, totalUses, byLanguage, byCategory };
    },
  });
}

export function useAddCodeSnippet() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (snippet: Omit<CodeSnippetInsert, 'created_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('code_snippets')
        .insert({
          ...snippet,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['code-snippets'] });
      queryClient.invalidateQueries({ queryKey: ['code-snippets-stats'] });
      toast({
        title: "Snippet disimpan",
        description: "Code snippet berhasil ditambahkan",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Gagal menyimpan snippet: ${error.message}`,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateCodeSnippet() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & CodeSnippetUpdate) => {
      const { data, error } = await supabase
        .from('code_snippets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['code-snippets'] });
      queryClient.invalidateQueries({ queryKey: ['code-snippets-stats'] });
      toast({
        title: "Snippet diperbarui",
        description: "Code snippet berhasil diupdate",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Gagal memperbarui snippet: ${error.message}`,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteCodeSnippet() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('code_snippets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['code-snippets'] });
      queryClient.invalidateQueries({ queryKey: ['code-snippets-stats'] });
      toast({
        title: "Snippet dihapus",
        description: "Code snippet berhasil dihapus",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Gagal menghapus snippet: ${error.message}`,
        variant: "destructive",
      });
    },
  });
}

export function useToggleSnippetFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_favorite }: { id: string; is_favorite: boolean }) => {
      const { error } = await supabase
        .from('code_snippets')
        .update({ is_favorite })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['code-snippets'] });
      queryClient.invalidateQueries({ queryKey: ['code-snippets-stats'] });
    },
  });
}

export function useIncrementSnippetUseCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: current } = await supabase
        .from('code_snippets')
        .select('use_count')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('code_snippets')
        .update({ use_count: (current?.use_count || 0) + 1 })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['code-snippets'] });
      queryClient.invalidateQueries({ queryKey: ['code-snippets-stats'] });
    },
  });
}
