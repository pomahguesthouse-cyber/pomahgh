import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RoomHotspot {
  id: string;
  room_id: string;
  pitch: number;
  yaw: number;
  hotspot_type: string;
  title: string;
  description?: string;
  feature_key?: string;
  icon_name: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export const useRoomHotspots = (roomId: string | undefined) => {
  return useQuery({
    queryKey: ["room-hotspots", roomId],
    queryFn: async () => {
      if (!roomId) return [];
      
      const { data, error } = await supabase
        .from("room_hotspots")
        .select("*")
        .eq("room_id", roomId)
        .eq("is_active", true)
        .order("display_order");

      if (error) throw error;
      return data as RoomHotspot[];
    },
    enabled: !!roomId,
  });
};

export const useAdminRoomHotspots = (roomId: string | undefined) => {
  return useQuery({
    queryKey: ["admin-room-hotspots", roomId],
    queryFn: async () => {
      if (!roomId) return [];
      
      const { data, error } = await supabase
        .from("room_hotspots")
        .select("*")
        .eq("room_id", roomId)
        .order("display_order");

      if (error) throw error;
      return data as RoomHotspot[];
    },
    enabled: !!roomId,
  });
};

export const useCreateHotspot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (hotspot: Omit<RoomHotspot, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("room_hotspots")
        .insert(hotspot)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["room-hotspots", variables.room_id] });
      queryClient.invalidateQueries({ queryKey: ["admin-room-hotspots", variables.room_id] });
      toast.success("Hotspot berhasil ditambahkan");
    },
    onError: (error: Error) => {
      toast.error("Gagal menambahkan hotspot", {
        description: error.message,
      });
    },
  });
};

export const useUpdateHotspot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RoomHotspot> & { id: string }) => {
      const { data, error } = await supabase
        .from("room_hotspots")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["room-hotspots", data.room_id] });
      queryClient.invalidateQueries({ queryKey: ["admin-room-hotspots", data.room_id] });
      toast.success("Hotspot berhasil diperbarui");
    },
    onError: (error: Error) => {
      toast.error("Gagal memperbarui hotspot", {
        description: error.message,
      });
    },
  });
};

export const useDeleteHotspot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, roomId }: { id: string; roomId: string }) => {
      const { error } = await supabase
        .from("room_hotspots")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return roomId;
    },
    onSuccess: (roomId) => {
      queryClient.invalidateQueries({ queryKey: ["room-hotspots", roomId] });
      queryClient.invalidateQueries({ queryKey: ["admin-room-hotspots", roomId] });
      toast.success("Hotspot berhasil dihapus");
    },
    onError: (error: Error) => {
      toast.error("Gagal menghapus hotspot", {
        description: error.message,
      });
    },
  });
};
