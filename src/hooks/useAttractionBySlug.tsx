import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CityAttraction } from "@/hooks/useCityAttractions";

export const useAttractionBySlug = (slug: string | undefined) => {
  return useQuery({
    queryKey: ["city-attraction", slug],
    queryFn: async () => {
      if (!slug) return null;

      const { data, error } = await supabase
        .from("city_attractions")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error) throw error;
      return data as unknown as CityAttraction;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
};
