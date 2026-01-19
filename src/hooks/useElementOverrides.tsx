import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ElementOverride } from '@/contexts/EditorModeContext';

export function useElementOverrides() {
  const queryClient = useQueryClient();

  const { data: overrides = {}, isLoading } = useQuery({
    queryKey: ['element-overrides'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('element_overrides')
        .select('*');

      if (error) throw error;
      
      // Convert to Record<string, ElementOverride>
      return data.reduce((acc, item) => {
        acc[item.element_id] = item.overrides as ElementOverride;
        return acc;
      }, {} as Record<string, ElementOverride>);
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (overridesToSave: Record<string, ElementOverride>) => {
      const upserts = Object.entries(overridesToSave).map(([element_id, override]) => ({
        element_id,
        overrides: override as any,
        updated_at: new Date().toISOString(),
      }));

      if (upserts.length === 0) return;

      const { error } = await supabase
        .from('element_overrides')
        .upsert(upserts, { onConflict: 'element_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['element-overrides'] });
    },
  });

  return {
    overrides,
    isLoading,
    saveOverrides: upsertMutation.mutateAsync,
    isSaving: upsertMutation.isPending,
  };
}
