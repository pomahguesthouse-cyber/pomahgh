import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TemplatePreset, ThemeConfig, WidgetConfig } from '@/types/editor.types';
import { Json } from '@/integrations/supabase/types';

export function useTemplatePresets() {
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading, refetch } = useQuery({
    queryKey: ['template-presets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('template_presets')
        .select('*')
        .order('is_system', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        theme_config: item.theme_config as unknown as Partial<ThemeConfig>,
        widget_config: (item.widget_config || []) as unknown as WidgetConfig[],
      })) as TemplatePreset[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (preset: { name: string; description: string | null; thumbnail_url?: string | null; theme_config: ThemeConfig; widget_config: WidgetConfig[]; is_system: boolean }) => {
      const { data, error } = await supabase
        .from('template_presets')
        .insert({
          name: preset.name,
          description: preset.description,
          thumbnail_url: preset.thumbnail_url || null,
          theme_config: preset.theme_config as unknown as Json,
          widget_config: preset.widget_config as unknown as Json,
          is_system: preset.is_system,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-presets'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('template_presets')
        .delete()
        .eq('id', id)
        .eq('is_system', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-presets'] });
    },
  });

  return {
    templates,
    isLoading,
    refetch,
    createTemplate: createMutation.mutateAsync,
    deleteTemplate: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}












