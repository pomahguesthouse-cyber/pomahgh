import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdminTrainingExample {
  id: string;
  question: string;
  ideal_answer: string;
  category: string | null;
  is_active: boolean | null;
  display_order: number | null;
  response_tags: string[] | null;
  created_at: string | null;
  updated_at: string | null;
}

export const useAdminTrainingExamples = () => {
  return useQuery({
    queryKey: ['admin-training-examples'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_chatbot_training_examples')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as AdminTrainingExample[];
    },
  });
};

export const useAdminTrainingStats = () => {
  return useQuery({
    queryKey: ['admin-training-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_chatbot_training_examples')
        .select('category, is_active');

      if (error) throw error;

      const total = data.length;
      const active = data.filter(e => e.is_active).length;
      const byCategory = data.reduce((acc, e) => {
        const cat = e.category || 'general';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return { total, active, byCategory };
    },
  });
};

export const useAddAdminTrainingExample = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (example: Omit<AdminTrainingExample, 'id' | 'created_at' | 'updated_at'>) => {
      // Get max display_order
      const { data: existing } = await supabase
        .from('admin_chatbot_training_examples')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1);

      const maxOrder = existing?.[0]?.display_order || 0;

      const { data, error } = await supabase
        .from('admin_chatbot_training_examples')
        .insert({ ...example, display_order: maxOrder + 1 })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-training-examples'] });
      queryClient.invalidateQueries({ queryKey: ['admin-training-stats'] });
      toast({
        title: 'Berhasil',
        description: 'Contoh training berhasil ditambahkan',
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

export const useUpdateAdminTrainingExample = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AdminTrainingExample> & { id: string }) => {
      const { data, error } = await supabase
        .from('admin_chatbot_training_examples')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-training-examples'] });
      queryClient.invalidateQueries({ queryKey: ['admin-training-stats'] });
      toast({
        title: 'Berhasil',
        description: 'Contoh training berhasil diupdate',
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

export const useDeleteAdminTrainingExample = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('admin_chatbot_training_examples')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-training-examples'] });
      queryClient.invalidateQueries({ queryKey: ['admin-training-stats'] });
      toast({
        title: 'Berhasil',
        description: 'Contoh training berhasil dihapus',
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

export const useToggleAdminTrainingExample = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('admin_chatbot_training_examples')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { is_active }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-training-examples'] });
      queryClient.invalidateQueries({ queryKey: ['admin-training-stats'] });
      toast({
        title: 'Berhasil',
        description: `Contoh ${is_active ? 'diaktifkan' : 'dinonaktifkan'}`,
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
