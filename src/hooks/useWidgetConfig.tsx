import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WidgetConfig, WidgetSettings } from '@/types/editor.types';
import { Json } from '@/integrations/supabase/types';

export function useWidgetConfig() {
  const queryClient = useQueryClient();

  const { data: widgetConfigs = [], isLoading, refetch } = useQuery({
    queryKey: ['widget-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('widget_config')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        settings: (item.settings || {}) as unknown as WidgetSettings,
      })) as WidgetConfig[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ 
      widgetId, 
      updates 
    }: { 
      widgetId: string; 
      updates: { enabled?: boolean; sort_order?: number; settings?: WidgetSettings } 
    }) => {
      const dbUpdates: { enabled?: boolean; sort_order?: number; settings?: Json } = {};
      if (updates.enabled !== undefined) dbUpdates.enabled = updates.enabled;
      if (updates.sort_order !== undefined) dbUpdates.sort_order = updates.sort_order;
      if (updates.settings !== undefined) dbUpdates.settings = updates.settings as unknown as Json;

      const { data, error } = await supabase
        .from('widget_config')
        .update(dbUpdates)
        .eq('widget_id', widgetId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widget-config'] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedWidgetIds: string[]) => {
      for (let i = 0; i < orderedWidgetIds.length; i++) {
        const { error } = await supabase
          .from('widget_config')
          .update({ sort_order: i })
          .eq('widget_id', orderedWidgetIds[i]);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widget-config'] });
    },
  });

  return {
    widgetConfigs,
    isLoading,
    refetch,
    updateWidgetConfig: (widgetId: string, updates: { enabled?: boolean; sort_order?: number; settings?: WidgetSettings }) => 
      updateMutation.mutateAsync({ widgetId, updates }),
    reorderWidgetConfigs: reorderMutation.mutateAsync,
    isUpdating: updateMutation.isPending || reorderMutation.isPending,
  };
}
