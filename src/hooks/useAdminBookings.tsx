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
  booking_addons?: Array<{
    id: string;
    addon_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    room_addons?: {
      name: string;
      icon_name: string;
    };
  }>;
}

export const useAdminBookings = () => {
  const queryClient = useQueryClient();
  const { checkBookingConflict } = useBookingValidation();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      // Limit to last 90 days to avoid unbounded growth
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

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
          ),
          booking_addons (
            id,
            addon_id,
            quantity,
            unit_price,
            total_price,
            room_addons (
              name,
              icon_name
            )
          )
        `)
        .gte("created_at", ninetyDaysAgo.toISOString())
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
    mutationFn: async (booking: Partial<Booking> & { id: string; editedRooms?: Array<{ id?: string; roomId: string; roomNumber: string; pricePerNight: number }>; editedAddons?: Array<{ addon_id: string; name: string; quantity: number; unit_price: number; total_price: number }>; booking_rooms?: unknown; rooms?: unknown; booking_addons?: unknown }) => {
      const { editedRooms, editedAddons, booking_rooms, rooms, booking_addons, ...bookingData } = booking;

      // Get current booking data for comparison
      const { data: currentBooking } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", booking.id)
        .single();

      if (!currentBooking) {
        throw new Error("Booking tidak ditemukan");
      }

      // Detect if dates or rooms actually changed - skip conflict check if not
      const datesChanged = (booking.check_in && booking.check_in !== currentBooking.check_in) ||
                           (booking.check_out && booking.check_out !== currentBooking.check_out) ||
                           (booking.check_in_time && booking.check_in_time !== currentBooking.check_in_time) ||
                           (booking.check_out_time && booking.check_out_time !== currentBooking.check_out_time);

      const existingRoomKeys = new Set(
        (Array.isArray(currentBooking) ? [] : []).concat(
          // fallback: use allocated_room_number for legacy
          currentBooking.allocated_room_number ? [`${currentBooking.room_id}|${currentBooking.allocated_room_number}`] : []
        )
      );
      // Fetch existing booking_rooms keys to detect room changes
      const { data: existingRoomsData } = await supabase
        .from("booking_rooms")
        .select("room_id, room_number")
        .eq("booking_id", booking.id);
      (existingRoomsData || []).forEach(r => existingRoomKeys.add(`${r.room_id}|${r.room_number}`));

      const newRoomKeys = new Set(
        (editedRooms || []).map(r => `${r.roomId}|${r.roomNumber}`)
      );
      const roomsChanged = editedRooms && editedRooms.length > 0 && (
        existingRoomKeys.size !== newRoomKeys.size ||
        [...newRoomKeys].some(k => !existingRoomKeys.has(k))
      );

      // Check for conflicts for ALL rooms in editedRooms - only if changed (parallel)
      if (editedRooms && editedRooms.length > 0 && (datesChanged || roomsChanged)) {
        const checkIn = booking.check_in ? parseISO(booking.check_in) : parseISO(currentBooking.check_in);
        const checkOut = booking.check_out ? parseISO(booking.check_out) : parseISO(currentBooking.check_out);
        const checkInTime = booking.check_in_time ?? currentBooking.check_in_time ?? undefined;
        const checkOutTime = booking.check_out_time ?? currentBooking.check_out_time ?? undefined;

        const conflictResults = await Promise.all(
          editedRooms.map(room =>
            checkBookingConflict({
              roomId: room.roomId,
              roomNumber: room.roomNumber,
              checkIn,
              checkOut,
              checkInTime,
              checkOutTime,
              excludeBookingId: booking.id
            }).then(result => ({ room, result }))
          )
        );

        const conflict = conflictResults.find(c => c.result.hasConflict);
        if (conflict) {
          throw new Error(`Konflik pada kamar ${conflict.room.roomNumber}: ${conflict.result.reason}`);
        }
      } else if (!editedRooms?.length && (datesChanged || booking.allocated_room_number)) {
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

      // Handle editedAddons - delete and re-insert
      if (editedAddons && Array.isArray(editedAddons)) {
        // Delete existing booking_addons
        await supabase
          .from("booking_addons")
          .delete()
          .eq("booking_id", booking.id);

        // Insert new addons if any
        if (editedAddons.length > 0) {
          const addonsData = editedAddons.map(addon => ({
            booking_id: booking.id,
            addon_id: addon.addon_id,
            quantity: addon.quantity,
            unit_price: addon.unit_price,
            total_price: addon.total_price,
          }));

          const { error: addonInsertError } = await supabase
            .from("booking_addons")
            .insert(addonsData);

          if (addonInsertError) {
            console.error("Error inserting booking_addons:", addonInsertError);
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
