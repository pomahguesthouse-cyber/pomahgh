import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface NearbyLocation {
  id: string;
  name: string;
  category: string;
  distance_km: number;
  travel_time_minutes: number;
  icon_name: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export const useNearbyLocations = () => {
  const queryClient = useQueryClient();

  const { data: locations, isLoading } = useQuery({
    queryKey: ["nearby-locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nearby_locations")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as NearbyLocation[];
    },
  });

  const createLocation = useMutation({
    mutationFn: async (location: Omit<NearbyLocation, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("nearby_locations")
        .insert(location)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nearby-locations"] });
      toast({
        title: "Success",
        description: "Nearby location created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create location: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateLocation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<NearbyLocation> & { id: string }) => {
      const { data, error } = await supabase
        .from("nearby_locations")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nearby-locations"] });
      toast({
        title: "Success",
        description: "Nearby location updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update location: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteLocation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("nearby_locations")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nearby-locations"] });
      toast({
        title: "Success",
        description: "Nearby location deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete location: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return {
    locations,
    isLoading,
    createLocation: createLocation.mutate,
    updateLocation: updateLocation.mutate,
    deleteLocation: deleteLocation.mutate,
    isCreating: createLocation.isPending,
    isUpdating: updateLocation.isPending,
    isDeleting: deleteLocation.isPending,
  };
};
