import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";
import { useBookingValidation } from "./useBookingValidation";

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
}

export const useBooking = () => {
  const queryClient = useQueryClient();
  const { checkBookingConflict } = useBookingValidation();

  return useMutation({
    mutationFn: async (bookingData: BookingData) => {
      // Check for conflicts if room number is provided
      if (bookingData.allocated_room_number) {
        const conflict = await checkBookingConflict({
          roomId: bookingData.room_id,
          roomNumber: bookingData.allocated_room_number,
          checkIn: bookingData.check_in,
          checkOut: bookingData.check_out,
          checkInTime: bookingData.check_in_time,
          checkOutTime: bookingData.check_out_time
        });

        if (conflict.hasConflict) {
          throw new Error(conflict.reason || "Double booking terdeteksi!");
        }
      }

      const totalNights = differenceInDays(bookingData.check_out, bookingData.check_in);
      const totalPrice = totalNights * bookingData.price_per_night;

      const { data, error } = await supabase.from("bookings").insert({
        room_id: bookingData.room_id,
        guest_name: bookingData.guest_name,
        guest_email: bookingData.guest_email,
        guest_phone: bookingData.guest_phone,
        check_in: bookingData.check_in.toISOString().split("T")[0],
        check_out: bookingData.check_out.toISOString().split("T")[0],
        check_in_time: bookingData.check_in_time || "14:00:00",
        check_out_time: bookingData.check_out_time || "12:00:00",
        total_nights: totalNights,
        total_price: totalPrice,
        num_guests: bookingData.num_guests,
        special_requests: bookingData.special_requests,
        status: "pending",
      }).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (bookingData) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      
      // Check if auto-send invoice is enabled
      const { data: settings } = await supabase
        .from('hotel_settings')
        .select('auto_send_invoice')
        .single();
      
      if (settings?.auto_send_invoice) {
        toast.info("Mengirim invoice...", { duration: 2000 });
        
        try {
          const { data, error } = await supabase.functions.invoke('send-invoice', {
            body: { 
              bookingId: bookingData.id,
              sendEmail: true,
              sendWhatsApp: true
            }
          });
          
          if (error) throw error;
          
          if (data.emailSent || data.whatsappSent) {
            const channels = [];
            if (data.emailSent) channels.push("email");
            if (data.whatsappSent) channels.push("WhatsApp");
            
            toast.success("Booking & Invoice berhasil dikirim!", {
              description: `Invoice ${data.invoiceNumber} telah dikirim via ${channels.join(" dan ")}`
            });
          }
        } catch (error) {
          console.error("Auto-send invoice error:", error);
          toast.warning("Booking berhasil, tapi invoice gagal dikirim", {
            description: "Admin dapat mengirim ulang invoice dari halaman Bookings"
          });
        }
      } else {
        toast.success("Booking berhasil!", {
          description: "Terima kasih! Kami akan mengirimkan konfirmasi ke email Anda."
        });
      }
    },
    onError: (error: Error) => {
      console.error("Booking error:", error);
      toast.error("Booking gagal", {
        description: "Terjadi kesalahan. Silakan coba lagi.",
      });
    },
  });
};
