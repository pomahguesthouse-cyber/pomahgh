import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RoomAddon {
  id: string;
  name: string;
  description: string | null;
  icon_name: string;
  price: number;
  price_type: "per_night" | "per_person_per_night" | "per_person" | "once";
  max_quantity: number;
  is_active: boolean;
  display_order: number;
  category: string;
  room_id: string | null;
  extra_capacity: number;
  created_at: string;
  updated_at: string;
}

export interface BookingAddon {
  addon_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export const useRoomAddons = (roomId?: string) => {
  return useQuery({
    queryKey: ["room-addons", roomId],
    queryFn: async () => {
      let query = supabase
        .from("room_addons")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      // If roomId is provided, get addons for that room OR addons that apply to all rooms (room_id is null)
      if (roomId) {
        query = query.or(`room_id.is.null,room_id.eq.${roomId}`);
      } else {
        query = query.is("room_id", null);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as RoomAddon[];
    },
  });
};

export const useAllRoomAddons = () => {
  return useQuery({
    queryKey: ["all-room-addons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_addons")
        .select("*")
        .order("display_order");

      if (error) throw error;
      return data as RoomAddon[];
    },
  });
};

export const useCreateRoomAddon = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (addon: Omit<RoomAddon, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("room_addons")
        .insert(addon)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-addons"] });
      queryClient.invalidateQueries({ queryKey: ["all-room-addons"] });
      toast.success("Layanan tambahan berhasil ditambahkan");
    },
    onError: (error: Error) => {
      toast.error("Gagal menambahkan layanan tambahan", {
        description: error.message,
      });
    },
  });
};

export const useUpdateRoomAddon = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...addon }: Partial<RoomAddon> & { id: string }) => {
      const { data, error } = await supabase
        .from("room_addons")
        .update(addon)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-addons"] });
      queryClient.invalidateQueries({ queryKey: ["all-room-addons"] });
      toast.success("Layanan tambahan berhasil diperbarui");
    },
    onError: (error: Error) => {
      toast.error("Gagal memperbarui layanan tambahan", {
        description: error.message,
      });
    },
  });
};

export const useDeleteRoomAddon = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("room_addons").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-addons"] });
      queryClient.invalidateQueries({ queryKey: ["all-room-addons"] });
      toast.success("Layanan tambahan berhasil dihapus");
    },
    onError: (error: Error) => {
      toast.error("Gagal menghapus layanan tambahan", {
        description: error.message,
      });
    },
  });
};

// Calculate addon price based on price type
export const calculateAddonPrice = (
  addon: RoomAddon,
  quantity: number,
  totalNights: number,
  numGuests: number
): number => {
  const basePrice = addon.price * quantity;

  switch (addon.price_type) {
    case "per_night":
      return basePrice * totalNights;
    case "per_person_per_night":
      return basePrice * totalNights * numGuests;
    case "per_person":
      return basePrice * numGuests;
    case "once":
    default:
      return basePrice;
  }
};

// Get price type label in Indonesian
export const getPriceTypeLabel = (priceType: string): string => {
  switch (priceType) {
    case "per_night":
      return "/ malam";
    case "per_person_per_night":
      return "/ orang / malam";
    case "per_person":
      return "/ orang";
    case "once":
      return "(sekali bayar)";
    default:
      return "";
  }
};












