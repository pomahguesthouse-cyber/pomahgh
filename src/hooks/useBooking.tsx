import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";
import { useBookingValidation } from "./useBookingValidation";
import { formatWIBDate } from "@/utils/wibTimezone";
import { BookingAddon } from "./useRoomAddons";

export interface BookingData {
  room_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  check_in: Date;
  check_out: Date;
  check_in_time?: string;
  check_out_time?: string;
  num_guests: number;
  special_requests?: string;
  price_per_night: number;
  allocated_room_number?: string;
  room_quantity?: number;
  is_non_refundable?: boolean;
  addons?: BookingAddon[];
}

export const useBooking = () => {
  const queryClient = useQueryClient();
  const { checkBookingConflict, checkRoomTypeAvailability } = useBookingValidation();

  return useMutation({
    mutationFn: async (bookingData: BookingData) => {
      const roomQuantity = bookingData.room_quantity || 1;
      const totalNights = differenceInDays(bookingData.check_out, bookingData.check_in);
      const roomPrice = totalNights * bookingData.price_per_night * roomQuantity;
      const addonsPrice = bookingData.addons?.reduce((sum, addon) => sum + addon.total_price, 0) || 0;
      const totalPrice = roomPrice + addonsPrice;

      // Get room to check available room numbers
      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .select("room_numbers, allotment")
        .eq("id", bookingData.room_id)
        .single();

      if (roomError) throw roomError;

      // Use checkRoomTypeAvailability to get available rooms (includes booking_rooms check)
      const { availableRooms } = await checkRoomTypeAvailability({
        roomId: bookingData.room_id,
        checkIn: bookingData.check_in,
        checkOut: bookingData.check_out,
      });

      if (availableRooms.length < roomQuantity) {
        throw new Error(`Hanya ${availableRooms.length} kamar tersedia untuk tanggal tersebut`);
      }

      const availableNumbers = availableRooms;

      // Create main booking with first room number
      const { data, error } = await supabase.from("bookings").insert({
        room_id: bookingData.room_id,
        guest_name: bookingData.guest_name,
        guest_email: bookingData.guest_email,
        guest_phone: bookingData.guest_phone,
        check_in: formatWIBDate(bookingData.check_in),
        check_out: formatWIBDate(bookingData.check_out),
        check_in_time: bookingData.check_in_time || "14:00:00",
        check_out_time: bookingData.check_out_time || "12:00:00",
        total_nights: totalNights,
        total_price: totalPrice,
        num_guests: bookingData.num_guests,
        special_requests: bookingData.special_requests,
        status: "pending",
        allocated_room_number: availableNumbers[0],
        is_non_refundable: bookingData.is_non_refundable || false,
        booking_source: 'other',
        other_source: 'Website',
      }).select().single();

      if (error) throw error;

      // Insert multiple entries into booking_rooms table
      if (roomQuantity > 0) {
        const bookingRoomsData = availableNumbers.slice(0, roomQuantity).map(roomNumber => ({
          booking_id: data.id,
          room_id: bookingData.room_id,
          room_number: roomNumber,
          price_per_night: bookingData.price_per_night,
        }));

        const { error: bookingRoomsError } = await supabase
          .from("booking_rooms")
          .insert(bookingRoomsData);

        if (bookingRoomsError) {
          console.error("Failed to insert booking_rooms:", bookingRoomsError);
        }
      }

      // Insert booking addons if any
      if (bookingData.addons && bookingData.addons.length > 0) {
        const bookingAddonsData = bookingData.addons.map(addon => ({
          booking_id: data.id,
          addon_id: addon.addon_id,
          quantity: addon.quantity,
          unit_price: addon.unit_price,
          total_price: addon.total_price,
        }));

        const { error: addonsError } = await supabase
          .from("booking_addons")
          .insert(bookingAddonsData);

        if (addonsError) {
          console.error("Failed to insert booking_addons:", addonsError);
        }
      }

      return data;
    },
    onSuccess: async (bookingData, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      
      // Notify managers via WhatsApp
      try {
        // Fetch room name for notification
        const { data: roomData } = await supabase
          .from("rooms")
          .select("name")
          .eq("id", variables.room_id)
          .single();

        await supabase.functions.invoke('notify-new-booking', {
          body: {
            booking_code: bookingData.booking_code,
            guest_name: bookingData.guest_name,
            guest_phone: bookingData.guest_phone,
            room_name: roomData?.name || 'Unknown Room',
            room_number: bookingData.allocated_room_number,
            check_in: bookingData.check_in,
            check_out: bookingData.check_out,
            total_nights: bookingData.total_nights,
            num_guests: bookingData.num_guests,
            total_price: bookingData.total_price,
            booking_source: bookingData.booking_source || 'other',
            other_source: bookingData.other_source || 'Website'
          }
        });
        console.log('✅ Manager notification sent');
      } catch (e) {
        console.error("Failed to notify managers:", e);
      }
      
      toast.success("Booking berhasil!", {
        description: "Terima kasih! Kami akan mengirimkan konfirmasi ke email Anda."
      });
    },
    onError: (error: Error) => {
      console.error("Booking error:", error);
      toast.error("Booking gagal", {
        description: "Terjadi kesalahan. Silakan coba lagi.",
      });
    },
  });
};
