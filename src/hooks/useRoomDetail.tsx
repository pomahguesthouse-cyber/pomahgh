import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useRoomDetail = (roomSlug: string) => {
  return useQuery({
    queryKey: ["room-detail", roomSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("slug", roomSlug)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Room not found");
      
      return data;
    },
    enabled: !!roomSlug
  });
};
