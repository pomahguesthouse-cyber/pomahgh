import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ElementOverride } from '@/contexts/EditorModeContext';

export function usePublicElementOverrides() {
  const { data: overrides = {}, isLoading } = useQuery({
    queryKey: ['public-element-overrides'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('element_overrides')
        .select('*');

      if (error) throw error;
      
      return data.reduce((acc, item) => {
        acc[item.element_id] = item.overrides as ElementOverride;
        return acc;
      }, {} as Record<string, ElementOverride>);
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return { overrides, isLoading };
}












