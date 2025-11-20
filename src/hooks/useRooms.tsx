import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Room {
  id: string;
  name: string;
  description: string;
  price_per_night: number;
  max_guests: number;
  features: string[];
  image_url: string;
  virtual_tour_url: string | null;
  available: boolean;
  size_sqm: number | null;
}

export const useRooms = () => {
  return useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("available", true)
        .order("price_per_night", { ascending: true });

      if (error) throw error;
      return data as Room[];
    },
  });
};
