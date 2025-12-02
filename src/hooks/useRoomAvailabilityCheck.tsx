import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AvailabilityResult {
  [roomId: string]: number; // roomId -> available count
}

export const useRoomAvailabilityCheck = (checkIn?: Date, checkOut?: Date) => {
  return useQuery({
    queryKey: ["room-availability", checkIn?.toISOString(), checkOut?.toISOString()],
    queryFn: async () => {
      if (!checkIn || !checkOut) return {} as AvailabilityResult;

      // Format dates for edge function
      const checkInStr = checkIn.toISOString().split('T')[0];
      const checkOutStr = checkOut.toISOString().split('T')[0];

      // Call edge function to bypass RLS and get accurate availability
      const { data, error } = await supabase.functions.invoke('check-room-availability', {
        body: { checkIn: checkInStr, checkOut: checkOutStr }
      });

      if (error) {
        console.error('Error checking room availability:', error);
        throw error;
      }

      return data as AvailabilityResult;
    },
    enabled: !!checkIn && !!checkOut,
  });
};
