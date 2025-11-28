import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UnavailableDate {
  id: string;
  room_id: string;
  unavailable_date: string;
  reason?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export const useRoomAvailability = (roomId?: string) => {
  const queryClient = useQueryClient();

  const { data: unavailableDates, isLoading } = useQuery({
    queryKey: ["room-unavailable-dates", roomId || "all"],
    queryFn: async () => {
      let query = supabase
        .from("room_unavailable_dates")
        .select("*")
        .order("unavailable_date");
      
      // If roomId provided, filter by specific room
      // Otherwise, fetch ALL unavailable dates for calendar view
      if (roomId) {
        query = query.eq("room_id", roomId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as UnavailableDate[];
    },
    enabled: true,
  });

  const addUnavailableDates = useMutation({
    mutationFn: async (dates: { room_id: string; unavailable_date: string; reason?: string; created_by?: string }[]) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User must be authenticated to block dates");
      }

      // Add created_by to all dates
      const datesWithUser = dates.map(date => ({
        ...date,
        created_by: date.created_by || user.id
      }));

      const { data, error } = await supabase
        .from("room_unavailable_dates")
        .upsert(datesWithUser, {
          onConflict: 'room_id,unavailable_date',
          ignoreDuplicates: false
        })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-unavailable-dates"] });
      toast.success("Unavailable dates added successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to add unavailable dates", {
        description: error.message,
      });
    },
  });

  const removeUnavailableDates = useMutation({
    mutationFn: async (dates: { room_id: string; unavailable_date: string }[]) => {
      // Delete matching dates for the room
      const promises = dates.map(({ room_id, unavailable_date }) =>
        supabase
          .from("room_unavailable_dates")
          .delete()
          .eq("room_id", room_id)
          .eq("unavailable_date", unavailable_date)
      );

      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw errors[0].error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-unavailable-dates"] });
      toast.success("Unavailable dates removed successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to remove unavailable dates", {
        description: error.message,
      });
    },
  });

  const isDateUnavailable = (date: Date): boolean => {
    if (!unavailableDates) return false;
    const dateStr = date.toISOString().split('T')[0];
    return unavailableDates.some(d => d.unavailable_date === dateStr);
  };

  return {
    unavailableDates: unavailableDates || [],
    isLoading,
    addUnavailableDates: addUnavailableDates.mutate,
    removeUnavailableDates: removeUnavailableDates.mutate,
    isDateUnavailable,
    isUpdating: addUnavailableDates.isPending || removeUnavailableDates.isPending,
  };
};
