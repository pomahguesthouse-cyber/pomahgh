import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BookingcomRoomMapping {
  id: string;
  room_id: string;
  bookingcom_room_id: string;
  bookingcom_rate_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  rooms?: { name: string };
}

export interface BookingcomSyncLog {
  id: string;
  sync_type: string;
  direction: string;
  room_id: string | null;
  request_payload: Record<string, unknown> | null;
  response_payload: Record<string, unknown> | null;
  http_status_code: number | null;
  success: boolean;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
}

export const useBookingcomSync = () => {
  const queryClient = useQueryClient();

  // Get room mappings
  const { data: mappings, isLoading: isLoadingMappings } = useQuery({
    queryKey: ["bookingcom-mappings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookingcom_room_mappings")
        .select("*, rooms(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BookingcomRoomMapping[];
    }
  });

  // Get sync logs
  const { data: syncLogs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ["bookingcom-sync-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookingcom_sync_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as BookingcomSyncLog[];
    }
  });

  // Add mapping
  const addMapping = useMutation({
    mutationFn: async (mapping: { room_id: string; bookingcom_room_id: string; bookingcom_rate_id: string }) => {
      const { data, error } = await supabase
        .from("bookingcom_room_mappings")
        .insert(mapping)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Room mapping added");
      queryClient.invalidateQueries({ queryKey: ["bookingcom-mappings"] });
    },
    onError: (err: Error) => toast.error("Failed to add mapping", { description: err.message }),
  });

  // Delete mapping
  const deleteMapping = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookingcom_room_mappings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mapping deleted");
      queryClient.invalidateQueries({ queryKey: ["bookingcom-mappings"] });
    },
    onError: (err: Error) => toast.error("Failed to delete", { description: err.message }),
  });

  // Push availability
  const pushAvailability = useMutation({
    mutationFn: async ({ room_id, date_from, date_to }: { room_id: string; date_from: string; date_to: string }) => {
      const { data, error } = await supabase.functions.invoke("bookingcom-push-availability", {
        body: { room_id, date_from, date_to }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Availability pushed to Booking.com");
      queryClient.invalidateQueries({ queryKey: ["bookingcom-sync-logs"] });
    },
    onError: (err: Error) => toast.error("Push failed", { description: err.message }),
  });

  // Pull reservations
  const pullReservations = useMutation({
    mutationFn: async (lastChange?: string) => {
      const { data, error } = await supabase.functions.invoke("bookingcom-pull-reservations", {
        body: { last_change: lastChange }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Pulled ${data?.results?.length || 0} reservations from Booking.com`);
      queryClient.invalidateQueries({ queryKey: ["bookingcom-sync-logs"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (err: Error) => toast.error("Pull failed", { description: err.message }),
  });

  return {
    mappings,
    isLoadingMappings,
    syncLogs,
    isLoadingLogs,
    addMapping,
    deleteMapping,
    pushAvailability,
    pullReservations,
  };
};
