import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RoomPromotion {
  id: string;
  room_id: string;
  name: string;
  description: string | null;
  promo_price: number | null;
  discount_percentage: number | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  min_nights: number;
  promo_code: string | null;
  badge_text: string;
  badge_color: string;
  priority: number;
  created_at: string;
  updated_at: string;
  rooms?: {
    id: string;
    name: string;
    price_per_night: number;
  };
}

export interface CreatePromotionData {
  room_id: string;
  name: string;
  description?: string;
  promo_price?: number | null;
  discount_percentage?: number | null;
  start_date: string;
  end_date: string;
  is_active?: boolean;
  min_nights?: number;
  promo_code?: string;
  badge_text?: string;
  badge_color?: string;
  priority?: number;
}

export const useRoomPromotions = () => {
  const queryClient = useQueryClient();

  const { data: promotions, isLoading } = useQuery({
    queryKey: ["room-promotions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_promotions")
        .select(`
          *,
          rooms (
            id,
            name,
            price_per_night
          )
        `)
        .order("start_date", { ascending: false });

      if (error) throw error;
      return data as RoomPromotion[];
    },
  });

  const createPromotion = useMutation({
    mutationFn: async (promotionData: CreatePromotionData) => {
      const { data, error } = await supabase
        .from("room_promotions")
        .insert(promotionData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-promotions"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast.success("Promosi berhasil dibuat");
    },
    onError: (error: Error) => {
      toast.error(`Gagal membuat promosi: ${error.message}`);
    },
  });

  const updatePromotion = useMutation({
    mutationFn: async ({ id, ...data }: Partial<RoomPromotion> & { id: string }) => {
      const { error } = await supabase
        .from("room_promotions")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-promotions"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast.success("Promosi berhasil diperbarui");
    },
    onError: (error: Error) => {
      toast.error(`Gagal memperbarui promosi: ${error.message}`);
    },
  });

  const deletePromotion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("room_promotions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-promotions"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast.success("Promosi berhasil dihapus");
    },
    onError: (error: Error) => {
      toast.error(`Gagal menghapus promosi: ${error.message}`);
    },
  });

  const togglePromotionStatus = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("room_promotions")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-promotions"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast.success("Status promosi berhasil diubah");
    },
    onError: (error: Error) => {
      toast.error(`Gagal mengubah status: ${error.message}`);
    },
  });

  // Get active promotions for a specific room
  const getActivePromotionsForRoom = (roomId: string) => {
    const today = new Date().toISOString().split("T")[0];
    return promotions?.filter(
      (p) =>
        p.room_id === roomId &&
        p.is_active &&
        p.start_date <= today &&
        p.end_date >= today
    ) || [];
  };

  // Get best promotion for a room (highest priority)
  const getBestPromotionForRoom = (roomId: string) => {
    const activePromos = getActivePromotionsForRoom(roomId);
    if (activePromos.length === 0) return null;
    return activePromos.reduce((best, current) => 
      current.priority > best.priority ? current : best
    );
  };

  return {
    promotions,
    isLoading,
    createPromotion,
    updatePromotion,
    deletePromotion,
    togglePromotionStatus,
    getActivePromotionsForRoom,
    getBestPromotionForRoom,
    isCreating: createPromotion.isPending,
    isUpdating: updatePromotion.isPending,
    isDeleting: deletePromotion.isPending,
  };
};

// Hook to get promotions with calculated prices
export const useActiveRoomPromotions = () => {
  return useQuery({
    queryKey: ["active-room-promotions"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      
      const { data, error } = await supabase
        .from("room_promotions")
        .select(`
          *,
          rooms (
            id,
            name,
            price_per_night
          )
        `)
        .eq("is_active", true)
        .lte("start_date", today)
        .gte("end_date", today)
        .order("priority", { ascending: false });

      if (error) throw error;
      return data as RoomPromotion[];
    },
  });
};












