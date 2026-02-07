import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useBookingValidation } from "./useBookingValidation";
import { parseISO } from "date-fns";
interface BookingConflictParams {
  roomId: string;
  roomNumber: string | null;
  checkIn: Date;
  checkOut: Date;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  excludeBookingId?: string;
}

interface Booking {
  id: string;
  booking_code: string;
  room_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string | null;
  check_in: string;
  check_out: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  total_nights: number;
  total_price: number;
  num_guests: number;
  status: string;
  special_requests?: string | null;
  created_at: string;
  allocated_room_number?: string | null;
  payment_status?: string | null;
  payment_amount?: number | null;
  booking_source?: string | null;
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
    mutationFn: async (booking: Partial<Booking> & { id: string; editedRooms?: Array<{ id?: string; roomId: string; roomNumber: string; pricePerNight: number }> }) => {
      const { editedRooms, booking_rooms, rooms, ...bookingData } = booking as any;

      // Get current booking data for comparison
      const { data: currentBooking } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", booking.id)
        .single();

      if (!currentBooking) {
        throw new Error("Booking tidak ditemukan");
      }

      // Check for conflicts for ALL rooms in editedRooms
      if (editedRooms && editedRooms.length > 0) {
        for (const room of editedRooms) {
          const conflict = await checkBookingConflict({
            roomId: room.roomId,
            roomNumber: room.roomNumber,
            checkIn: booking.check_in ? parseISO(booking.check_in) : parseISO(currentBooking.check_in),
            checkOut: booking.check_out ? parseISO(booking.check_out) : parseISO(currentBooking.check_out),
            checkInTime: booking.check_in_time ?? currentBooking.check_in_time ?? undefined,
            checkOutTime: booking.check_out_time ?? currentBooking.check_out_time ?? undefined,
            excludeBookingId: booking.id
          });

          if (conflict.hasConflict) {
            throw new Error(`Konflik pada kamar ${room.roomNumber}: ${conflict.reason}`);
          }
        }
      } else if (booking.check_in || booking.check_out || booking.allocated_room_number) {
        // Fallback: check single room conflict if no editedRooms
        const conflict = await checkBookingConflict({
          roomId: currentBooking.room_id,
          roomNumber: booking.allocated_room_number ?? currentBooking.allocated_room_number ?? '',
          checkIn: booking.check_in ? parseISO(booking.check_in) : parseISO(currentBooking.check_in),
          checkOut: booking.check_out ? parseISO(booking.check_out) : parseISO(currentBooking.check_out),
          checkInTime: booking.check_in_time ?? currentBooking.check_in_time ?? undefined,
          checkOutTime: booking.check_out_time ?? currentBooking.check_out_time ?? undefined,
          excludeBookingId: booking.id
        });

        if (conflict.hasConflict) {
          throw new Error(conflict.reason || "Double booking terdeteksi!");
        }
      }

      // Auto-sync allocated_room_number with first room in editedRooms
      if (editedRooms && editedRooms.length > 0) {
        bookingData.allocated_room_number = editedRooms[0].roomNumber;
      }

      const { data, error } = await supabase
        .from("bookings")
        .update(bookingData)
        .eq("id", booking.id)
        .select()
        .single();

      if (error) throw error;

      // Handle editedRooms (from grid selector) - delete and re-insert approach
      if (editedRooms && Array.isArray(editedRooms) && editedRooms.length > 0) {
        // Delete existing booking_rooms
        const { error: deleteError } = await supabase
          .from("booking_rooms")
          .delete()
          .eq("booking_id", booking.id);
        
        if (deleteError) {
          console.error("Error deleting booking_rooms:", deleteError);
        }

        // Insert new booking_rooms
        const bookingRoomsData = editedRooms.map(room => ({
          booking_id: booking.id,
          room_id: room.roomId,
          room_number: room.roomNumber,
          price_per_night: room.pricePerNight
        }));

        const { error: insertError } = await supabase
          .from("booking_rooms")
          .insert(bookingRoomsData);
        
        if (insertError) {
          console.error("Error inserting booking_rooms:", insertError);
        }
      } else if (booking_rooms && Array.isArray(booking_rooms) && booking_rooms.length > 0) {
        // Fallback: Update each booking_room individually (legacy path)
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
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      toast.success("Booking berhasil diperbarui");
    },
    onError: (error: Error) => {
      toast.error("Gagal memperbarui booking", {
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
