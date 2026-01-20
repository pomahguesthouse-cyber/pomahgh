import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/shared/useToast";

export interface CityAttraction {
  id: string;
  name: string;
  slug: string;
  description?: string;
  long_description?: string;
  category: string;
  image_url?: string;
  gallery_images?: string[];
  address?: string;
  latitude?: number;
  longitude?: number;
  distance_km?: number;
  travel_time_minutes?: number;
  tips?: string;
  best_time_to_visit?: string;
  price_range?: string;
  icon_name: string;
  display_order: number;
  is_featured: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export const useCityAttractions = () => {
  const queryClient = useQueryClient();

  const { data: attractions = [], isLoading } = useQuery({
    queryKey: ["city-attractions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("city_attractions")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as CityAttraction[];
    },
  });

  const createAttraction = useMutation({
    mutationFn: async (attraction: Omit<CityAttraction, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("city_attractions")
        .insert(attraction)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["city-attractions"] });
      toast({ title: "Sukses", description: "Atraksi berhasil ditambahkan" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateAttraction = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CityAttraction> & { id: string }) => {
      const { data, error } = await supabase
        .from("city_attractions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["city-attractions"] });
      toast({ title: "Sukses", description: "Atraksi berhasil diperbarui" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteAttraction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("city_attractions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["city-attractions"] });
      toast({ title: "Sukses", description: "Atraksi berhasil dihapus" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return {
    attractions,
    isLoading,
    createAttraction,
    updateAttraction,
    deleteAttraction,
    isCreating: createAttraction.isPending,
    isUpdating: updateAttraction.isPending,
    isDeleting: deleteAttraction.isPending,
  };
};












