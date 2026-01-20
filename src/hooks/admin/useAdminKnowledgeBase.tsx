import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/shared/useToast';

export interface AdminKnowledgeEntry {
  id: string;
  title: string;
  source_type: string;
  source_url: string | null;
  original_filename: string | null;
  content: string | null;
  summary: string | null;
  category: string | null;
  is_active: boolean | null;
  tokens_count: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export const useAdminKnowledgeBase = () => {
  return useQuery({
    queryKey: ['admin-knowledge-base'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_chatbot_knowledge_base')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AdminKnowledgeEntry[];
    },
  });
};

export const useAddAdminKnowledge = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (entry: Omit<AdminKnowledgeEntry, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('admin_chatbot_knowledge_base')
        .insert(entry)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-knowledge-base'] });
      toast({
        title: 'Berhasil',
        description: 'Knowledge berhasil ditambahkan',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateAdminKnowledge = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AdminKnowledgeEntry> & { id: string }) => {
      const { data, error } = await supabase
        .from('admin_chatbot_knowledge_base')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-knowledge-base'] });
      toast({
        title: 'Berhasil',
        description: 'Knowledge berhasil diupdate',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteAdminKnowledge = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('admin_chatbot_knowledge_base')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-knowledge-base'] });
      toast({
        title: 'Berhasil',
        description: 'Knowledge berhasil dihapus',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useToggleAdminKnowledge = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('admin_chatbot_knowledge_base')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { is_active }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-knowledge-base'] });
      toast({
        title: 'Berhasil',
        description: `Knowledge ${is_active ? 'diaktifkan' : 'dinonaktifkan'}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useParseAdminKnowledge = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      type, 
      content, 
      title, 
      category,
      filename 
    }: { 
      type: 'text' | 'url' | 'file';
      content: string;
      title: string;
      category: string;
      filename?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('parse-admin-knowledge', {
        body: { type, content, title, category, filename },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-knowledge-base'] });
      toast({
        title: 'Berhasil',
        description: 'Knowledge berhasil diproses dan disimpan',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};












