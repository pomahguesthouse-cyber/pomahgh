import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";

export interface BookingData {
  room_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  check_in: Date;
  check_out: Date;
  num_guests: number;
  special_requests?: string;
  price_per_night: number;
}

export const useBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingData: BookingData) => {
      const totalNights = differenceInDays(bookingData.check_out, bookingData.check_in);
      const totalPrice = totalNights * bookingData.price_per_night;

      const { data, error } = await supabase.from("bookings").insert({
        room_id: bookingData.room_id,
        guest_name: bookingData.guest_name,
        guest_email: bookingData.guest_email,
        guest_phone: bookingData.guest_phone,
        check_in: bookingData.check_in.toISOString().split("T")[0],
        check_out: bookingData.check_out.toISOString().split("T")[0],
        total_nights: totalNights,
        total_price: totalPrice,
        num_guests: bookingData.num_guests,
        special_requests: bookingData.special_requests,
        status: "pending",
      }).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Booking berhasil!", {
        description: "Terima kasih! Kami akan mengirimkan konfirmasi ke email Anda.",
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
