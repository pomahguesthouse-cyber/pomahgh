import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useBookingValidation } from "./useBookingValidation";
import { parseISO } from "date-fns";

interface Booking {
  id: string;
  booking_code: string;
  room_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  check_in: string;
  check_out: string;
  check_in_time?: string;
  check_out_time?: string;
  total_nights: number;
  total_price: number;
  num_guests: number;
  status: string;
  special_requests?: string;
  created_at: string;
  allocated_room_number?: string | null;
  payment_status?: string;
  payment_amount?: number;
  booking_source?: "direct" | "ota" | "walk_in" | "other";
  ota_name?: string | null;
  other_source?: string | null;
  rooms?: {
    name: string;
    room_count: number;
    allotment: number;
  };
  booking_rooms?: Array<{
    id: string;
    room_id: string;
    room_number: string;
    price_per_night: number;
  }>;
}

export const useAdminBookings = () => {
  const queryClient = useQueryClient();
  const { checkBookingConflict } = useBookingValidation();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          rooms (
            name,
            room_count,
            allotment
          ),
          booking_rooms (
            id,
            room_id,
            room_number,
            price_per_night
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Booking[];
    },
  });

  const updateBookingStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from("bookings")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      toast.success("Booking status updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update booking", {
        description: error.message,
      });
    },
  });

  const updateBooking = useMutation({
    mutationFn: async (booking: Partial<Booking> & { id: string }) => {
      // Check for conflicts if dates/room changed
      if (booking.check_in || booking.check_out || booking.allocated_room_number) {
        const { data: currentBooking } = await supabase
          .from("bookings")
          .select("*")
          .eq("id", booking.id)
          .single();

        if (currentBooking) {
          const conflict = await checkBookingConflict({
            roomId: currentBooking.room_id,
            roomNumber: booking.allocated_room_number || currentBooking.allocated_room_number,
            checkIn: booking.check_in ? parseISO(booking.check_in) : parseISO(currentBooking.check_in),
            checkOut: booking.check_out ? parseISO(booking.check_out) : parseISO(currentBooking.check_out),
            checkInTime: booking.check_in_time || currentBooking.check_in_time,
            checkOutTime: booking.check_out_time || currentBooking.check_out_time,
            excludeBookingId: booking.id
          });

          if (conflict.hasConflict) {
            throw new Error(conflict.reason || "Double booking terdeteksi!");
          }
        }
      }

      // Extract booking_rooms from the booking object before updating main table
      const { booking_rooms, rooms, ...bookingData } = booking as any;

      const { data, error } = await supabase
        .from("bookings")
        .update(bookingData)
        .eq("id", booking.id)
        .select()
        .single();

      if (error) throw error;

      // Update each booking_room individually if booking_rooms array is provided
      if (booking_rooms && Array.isArray(booking_rooms) && booking_rooms.length > 0) {
        for (const br of booking_rooms) {
          if (br.id) {
            const { error: brError } = await supabase
              .from("booking_rooms")
              .update({
                room_id: br.room_id,
                room_number: br.room_number,
                price_per_night: br.price_per_night
              })
              .eq("id", br.id);
            
            if (brError) {
              console.error("Error updating booking_room:", brError);
            }
          }
        }
      } else if (bookingData.room_id || bookingData.allocated_room_number) {
        // Fallback: Sync booking_rooms table for legacy single-room bookings
        const { data: existingRooms } = await supabase
          .from("booking_rooms")
          .select("*")
          .eq("booking_id", booking.id);

        if (existingRooms && existingRooms.length > 0) {
          const updateData: any = {};
          if (bookingData.allocated_room_number) {
            updateData.room_number = bookingData.allocated_room_number;
          }
          if (bookingData.room_id) {
            updateData.room_id = bookingData.room_id;
          }
          
          await supabase
            .from("booking_rooms")
            .update(updateData)
            .eq("id", existingRooms[0].id);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to update booking", {
        description: error.message,
      });
    },
  });

  const deleteBooking = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      toast.success("Booking deleted");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete booking", {
        description: error.message,
      });
    },
  });

  return {
    bookings,
    isLoading,
    updateBookingStatus: updateBookingStatus.mutateAsync,
    updateBooking: updateBooking.mutateAsync,
    deleteBooking: deleteBooking.mutateAsync,
    isUpdating: updateBookingStatus.isPending || updateBooking.isPending,
    isDeleting: deleteBooking.isPending,
  };
};
