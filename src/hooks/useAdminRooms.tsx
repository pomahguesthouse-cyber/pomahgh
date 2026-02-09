import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Room } from "./useRooms";

export const useAdminRooms = () => {
  const queryClient = useQueryClient();

  const { data: rooms, isLoading } = useQuery({
    queryKey: ["admin-rooms"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("rooms")
          .select("*")
          .order("name");

        if (error) {
          // If column not found, try without use_autopricing
          if (error.message?.includes("use_autopricing")) {
            console.warn("use_autopricing column not found, fetching without it");
            const { data: fallbackData, error: fallbackError } = await supabase
              .from("rooms")
              .select(`
                id, name, slug, description, price_per_night, max_guests, features,
                image_url, image_urls, virtual_tour_url, available, size_sqm,
                room_count, room_numbers, allotment, base_price, final_price,
                promo_price, promo_start_date, promo_end_date,
                monday_price, tuesday_price, wednesday_price, thursday_price,
                friday_price, saturday_price, sunday_price, transition_effect,
                floor_plan_url, floor_plan_enabled, is_non_refundable,
                monday_non_refundable, tuesday_non_refundable, wednesday_non_refundable,
                thursday_non_refundable, friday_non_refundable, saturday_non_refundable,
                sunday_non_refundable, created_at, updated_at
              `)
              .order("name");
            
            if (fallbackError) throw fallbackError;
            // Add use_autopricing: false as default
            return (fallbackData || []).map(room => ({ ...room, use_autopricing: false })) as Room[];
          }
          throw error;
        }
        return data as Room[];
      } catch (err) {
        console.error("Error fetching rooms:", err);
        throw err;
      }
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
