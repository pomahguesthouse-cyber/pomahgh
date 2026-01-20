import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/shared/useToast';

export interface KnowledgeEntry {
  id: string;
  title: string;
  source_type: 'pdf' | 'word' | 'txt' | 'url';
  source_url: string | null;
  original_filename: string | null;
  content: string;
  summary: string | null;
  category: string;
  is_active: boolean;
  tokens_count: number | null;
  created_at: string;
  updated_at: string;
}

export const useKnowledgeBase = () => {
  return useQuery({
    queryKey: ['knowledge-base'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chatbot_knowledge_base')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as KnowledgeEntry[];
    }
  });
};

export const useUploadKnowledge = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ file, title, category }: { file: File; title: string; category: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('category', category);

      const { data, error } = await supabase.functions.invoke('parse-knowledge', {
        body: formData
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
      toast({
        title: 'Berhasil',
        description: 'Knowledge berhasil ditambahkan'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Gagal',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
};

export const useAddUrlKnowledge = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ url, title, category }: { url: string; title: string; category: string }) => {
      const formData = new FormData();
      formData.append('url', url);
      formData.append('title', title);
      formData.append('category', category);

      const { data, error } = await supabase.functions.invoke('parse-knowledge', {
        body: formData
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
      toast({
        title: 'Berhasil',
        description: 'URL knowledge berhasil ditambahkan'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Gagal',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
};

export const useUpdateKnowledge = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<KnowledgeEntry> & { id: string }) => {
      const { data, error } = await supabase
        .from('chatbot_knowledge_base')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
      toast({
        title: 'Berhasil',
        description: 'Knowledge berhasil diperbarui'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Gagal',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
};

export const useDeleteKnowledge = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('chatbot_knowledge_base')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
      toast({
        title: 'Berhasil',
        description: 'Knowledge berhasil dihapus'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Gagal',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
};

export const useToggleKnowledge = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('chatbot_knowledge_base')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { is_active }) => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
      toast({
        title: 'Berhasil',
        description: is_active ? 'Knowledge diaktifkan' : 'Knowledge dinonaktifkan'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Gagal',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
};












