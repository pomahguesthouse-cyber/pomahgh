import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ThemeConfig } from '@/types/editor.types';

export function useThemeConfig() {
  const queryClient = useQueryClient();

  const { data: themeConfig, isLoading, refetch } = useQuery({
    queryKey: ['theme-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('theme_config')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data as ThemeConfig;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<ThemeConfig>) => {
      if (!themeConfig?.id) throw new Error('No active theme found');
      
      const { data, error } = await supabase
        .from('theme_config')
        .update(updates)
        .eq('id', themeConfig.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theme-config'] });
    },
  });

  return {
    themeConfig,
    isLoading,
    refetch,
    updateThemeConfig: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}












