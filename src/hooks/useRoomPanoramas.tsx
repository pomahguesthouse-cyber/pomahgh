import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RoomPanorama {
  id: string;
  room_id: string;
  title: string;
  description?: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
  is_active: boolean;
  floor_plan_x?: number;
  floor_plan_y?: number;
  floor_plan_icon?: string;
  created_at?: string;
  updated_at?: string;
}

export const useRoomPanoramas = (roomId: string | undefined) => {
  return useQuery({
    queryKey: ["room-panoramas", roomId],
    queryFn: async () => {
      if (!roomId) return [];
      
      const { data, error } = await supabase
        .from("room_panoramas")
        .select("*")
        .eq("room_id", roomId)
        .eq("is_active", true)
        .order("display_order");

      if (error) throw error;
      return data as RoomPanorama[];
    },
    enabled: !!roomId,
  });
};

export const useAdminRoomPanoramas = (roomId: string | undefined) => {
  return useQuery({
    queryKey: ["admin-room-panoramas", roomId],
    queryFn: async () => {
      if (!roomId) return [];
      
      const { data, error } = await supabase
        .from("room_panoramas")
        .select("*")
        .eq("room_id", roomId)
        .order("display_order");

      if (error) throw error;
      return data as RoomPanorama[];
    },
    enabled: !!roomId,
  });
};

export const useCreatePanorama = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (panorama: Omit<RoomPanorama, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("room_panoramas")
        .insert(panorama)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["room-panoramas", variables.room_id] });
      queryClient.invalidateQueries({ queryKey: ["admin-room-panoramas", variables.room_id] });
      toast.success("Panorama berhasil ditambahkan");
    },
    onError: (error: Error) => {
      toast.error("Gagal menambahkan panorama", {
        description: error.message,
      });
    },
  });
};

export const useUpdatePanorama = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RoomPanorama> & { id: string }) => {
      const { data, error } = await supabase
        .from("room_panoramas")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["room-panoramas", data.room_id] });
      queryClient.invalidateQueries({ queryKey: ["admin-room-panoramas", data.room_id] });
      toast.success("Panorama berhasil diperbarui");
    },
    onError: (error: Error) => {
      toast.error("Gagal memperbarui panorama", {
        description: error.message,
      });
    },
  });
};

export const useDeletePanorama = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, roomId }: { id: string; roomId: string }) => {
      const { error } = await supabase
        .from("room_panoramas")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return roomId;
    },
    onSuccess: (roomId) => {
      queryClient.invalidateQueries({ queryKey: ["room-panoramas", roomId] });
      queryClient.invalidateQueries({ queryKey: ["admin-room-panoramas", roomId] });
      toast.success("Panorama berhasil dihapus");
    },
    onError: (error: Error) => {
      toast.error("Gagal menghapus panorama", {
        description: error.message,
      });
    },
  });
};

export const useSetPrimaryPanorama = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, roomId }: { id: string; roomId: string }) => {
      // First, unset all primary flags for this room
      await supabase
        .from("room_panoramas")
        .update({ is_primary: false })
        .eq("room_id", roomId);

      // Then set the new primary
      const { data, error } = await supabase
        .from("room_panoramas")
        .update({ is_primary: true })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["room-panoramas", data.room_id] });
      queryClient.invalidateQueries({ queryKey: ["admin-room-panoramas", data.room_id] });
      toast.success("Panorama utama berhasil diatur");
    },
    onError: (error: Error) => {
      toast.error("Gagal mengatur panorama utama", {
        description: error.message,
      });
    },
  });
};
