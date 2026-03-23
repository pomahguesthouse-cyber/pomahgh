import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CityAttraction {
  id: string;
  slug: string;
  name: string;
  description: string;
  image_url: string | null;
  city: string | null;
  category: string | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_link: string | null;
  operational_hours: string | null;
  contact_info: string | null;
  working_days: string | null;
  is_featured: boolean;
  distance_from_hotel: string | null;
  travel_time: string | null;
  ticket_price: string | null;
  rating: number | null;
  review_count: string | null;
}

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
      return data as CityAttraction;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
