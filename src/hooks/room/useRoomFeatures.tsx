import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RoomFeature {
  id: string;
  feature_key: string;
  label: string;
  icon_name: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export const useRoomFeatures = () => {
  return useQuery({
    queryKey: ["room-features"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_features")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as RoomFeature[];
    },
  });
};

export const useAdminRoomFeatures = () => {
  return useQuery({
    queryKey: ["admin-room-features"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_features")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as RoomFeature[];
    },
  });
};

export const useCreateRoomFeature = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feature: Omit<RoomFeature, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("room_features")
        .insert(feature)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-features"] });
      queryClient.invalidateQueries({ queryKey: ["admin-room-features"] });
      toast.success("Room feature created successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to create room feature", {
        description: error.message,
      });
    },
  });
};

export const useUpdateRoomFeature = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RoomFeature> & { id: string }) => {
      const { data, error } = await supabase
        .from("room_features")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-features"] });
      queryClient.invalidateQueries({ queryKey: ["admin-room-features"] });
      toast.success("Room feature updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update room feature", {
        description: error.message,
      });
    },
  });
};

export const useDeleteRoomFeature = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("room_features")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-features"] });
      queryClient.invalidateQueries({ queryKey: ["admin-room-features"] });
      toast.success("Room feature deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete room feature", {
        description: error.message,
      });
    },
  });
};












