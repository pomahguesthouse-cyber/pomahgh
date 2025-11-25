import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useAvailabilitySync = () => {
  const queryClient = useQueryClient();

  // Manual trigger sync
  const triggerSync = useMutation({
    mutationFn: async ({ 
      roomId, 
      dateFrom, 
      dateTo 
    }: { 
      roomId: string; 
      dateFrom: string; 
      dateTo: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('sync-availability', {
        body: {
          room_id: roomId,
          date_from: dateFrom,
          date_to: dateTo,
          triggered_by: 'manual'
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Availability sync started");
      queryClient.invalidateQueries({ queryKey: ["sync-logs"] });
      queryClient.invalidateQueries({ queryKey: ["sync-queue"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to sync availability", {
        description: error.message
      });
    }
  });

  // Get sync logs
  const { data: syncLogs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ["sync-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("availability_sync_logs")
        .select(`
          *,
          channel_managers(name),
          rooms(name)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    }
  });

  // Get sync queue
  const { data: syncQueue, isLoading: isLoadingQueue } = useQuery({
    queryKey: ["sync-queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("availability_sync_queue")
        .select(`
          *,
          channel_managers(name),
          rooms(name)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    }
  });

  // Get channel managers
  const { data: channelManagers, isLoading: isLoadingManagers } = useQuery({
    queryKey: ["channel-managers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("channel_managers")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    }
  });

  return {
    triggerSync: triggerSync.mutateAsync,
    isSyncing: triggerSync.isPending,
    syncLogs,
    isLoadingLogs,
    syncQueue,
    isLoadingQueue,
    channelManagers,
    isLoadingManagers
  };
};
