import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Room } from "./useRooms";

export const useAdminRooms = () => {
  const queryClient = useQueryClient();

  const { data: rooms, isLoading } = useQuery({
    queryKey: ["admin-rooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Room[];
    },
  });

  const createRoom = useMutation({
    mutationFn: async (roomData: Omit<Room, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("rooms")
        .insert(roomData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-rooms"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast.success("Room created successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to create room", {
        description: error.message,
      });
    },
  });

  const updateRoom = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Room> & { id: string }) => {
      const { data, error } = await supabase
        .from("rooms")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-rooms"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast.success("Room updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update room", {
        description: error.message,
      });
    },
  });

  const deleteRoom = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("rooms")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-rooms"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast.success("Room deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete room", {
        description: error.message,
      });
    },
  });

  return {
    rooms,
    isLoading,
    createRoom: createRoom.mutate,
    updateRoom: updateRoom.mutate,
    deleteRoom: deleteRoom.mutate,
    isCreating: createRoom.isPending,
    isUpdating: updateRoom.isPending,
    isDeleting: deleteRoom.isPending,
  };
};
