import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PriceChangeNotification {
  id: string;
  competitor_room_id: string;
  previous_price: number;
  new_price: number;
  price_change_percent: number;
  our_room_id: string | null;
  is_read: boolean;
  created_at: string;
  competitor_room?: {
    room_name: string;
    competitor_hotel: {
      name: string;
    } | null;
  };
  our_room?: {
    id: string;
    name: string;
  } | null;
}

export const usePriceChangeNotifications = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading, error, refetch } = useQuery({
    queryKey: ["price-change-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("price_change_notifications")
        .select(`
          *,
          competitor_room:competitor_rooms(
            room_name,
            competitor_hotel:competitor_hotels(name)
          ),
          our_room:rooms(id, name)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as PriceChangeNotification[];
    },
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("price_change_notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-change-notifications"] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("price_change_notifications")
        .update({ is_read: true })
        .eq("is_read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-change-notifications"] });
      toast({
        title: "Semua notifikasi ditandai sudah dibaca",
      });
    },
  });

  const checkPriceChanges = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-price-changes");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["price-change-notifications"] });
      toast({
        title: "Pengecekan selesai",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refetch,
    markAsRead,
    markAllAsRead,
    checkPriceChanges,
  };
};
