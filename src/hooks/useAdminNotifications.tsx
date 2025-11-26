import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, AlertCircle } from "lucide-react";

export const useAdminNotifications = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Subscribe to failed sync logs
    const syncLogsChannel = supabase
      .channel('sync-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'availability_sync_logs',
          filter: 'success=eq.false'
        },
        (payload) => {
          console.log('Failed sync detected:', payload);
          toast.error("Sync Failed", {
            description: `Channel manager sync failed: ${payload.new.error_message || 'Unknown error'}`,
            icon: <AlertCircle className="h-4 w-4" />,
            duration: 10000,
          });
          queryClient.invalidateQueries({ queryKey: ["sync-logs"] });
        }
      )
      .subscribe();

    // Subscribe to new bookings
    const bookingsChannel = supabase
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          console.log('New booking detected:', payload);
          toast.success("New Booking!", {
            description: `${payload.new.guest_name} - ${payload.new.room_id}`,
            icon: <Bell className="h-4 w-4" />,
            duration: 8000,
          });
          queryClient.invalidateQueries({ queryKey: ["bookings"] });
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(syncLogsChannel);
      supabase.removeChannel(bookingsChannel);
    };
  }, [queryClient]);
};
