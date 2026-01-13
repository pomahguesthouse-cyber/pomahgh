import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface GoogleRating {
  rating: number | null;
  reviewCount: number;
  googleMapsUrl: string;
}

export function useGoogleRating() {
  return useQuery({
    queryKey: ["google-rating"],
    queryFn: async (): Promise<GoogleRating> => {
      const { data, error } = await supabase.functions.invoke("get-google-rating");
      
      if (error) {
        console.error("Error fetching Google rating:", error);
        throw error;
      }
      
      return data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
    retry: 1,
  });
}
