import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BookingHistoryItem {
  id: string;
  booking_code: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  room_name: string;
  check_in: string;
  check_out: string;
  total_nights: number;
  total_price: number;
  status: string;
  payment_status: string;
  va_number: string | null;
  created_at: string;
  is_inline_payment: boolean;
}

interface UseBookingHistoryReturn {
  bookings: BookingHistoryItem[];
  activeBookings: BookingHistoryItem[];
  pastBookings: BookingHistoryItem[];
  isLoading: boolean;
  refetch: () => void;
  cancelBooking: (bookingId: string) => Promise<boolean>;
}

export const useBookingHistory = (userId: string | null): UseBookingHistoryReturn => {
  const [bookings, setBookings] = useState<BookingHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    if (!userId) {
      setBookings([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          booking_code,
          guest_name,
          guest_email,
          guest_phone,
          check_in,
          check_out,
          total_nights,
          total_price,
          status,
          payment_status,
          va_number,
          created_at,
          is_inline_payment,
          rooms(name)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedBookings: BookingHistoryItem[] = data?.map((booking: any) => ({
        id: booking.id,
        booking_code: booking.booking_code,
        guest_name: booking.guest_name,
        guest_email: booking.guest_email,
        guest_phone: booking.guest_phone || null,
        room_name: booking.rooms?.name || "Unknown Room",
        check_in: booking.check_in,
        check_out: booking.check_out,
        total_nights: booking.total_nights,
        total_price: booking.total_price,
        status: booking.status,
        payment_status: booking.payment_status,
        va_number: booking.va_number,
        created_at: booking.created_at,
        is_inline_payment: booking.is_inline_payment
      })) || [];

      setBookings(formattedBookings);
    } catch (error: any) {
      console.error("Error fetching bookings:", error);
      toast.error("Gagal memuat riwayat booking");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Active bookings: pending, confirmed, checked_in
  const activeBookings = bookings.filter(b => 
    ["pending_payment", "confirmed", "checked_in"].includes(b.status)
  );

  // Past bookings: checked_out, cancelled, expired
  const pastBookings = bookings.filter(b => 
    ["checked_out", "cancelled"].includes(b.status) || b.payment_status === "expired"
  );

  const cancelBooking = useCallback(async (bookingId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          status: "cancelled",
          cancellation_reason: "Cancelled by user",
          updated_at: new Date().toISOString()
        })
        .eq("id", bookingId)
        .eq("user_id", userId || "");

      if (error) throw error;

      toast.success("Booking berhasil dibatalkan");
      await fetchBookings();
      return true;
    } catch (error: any) {
      toast.error(error.message || "Gagal membatalkan booking");
      return false;
    }
  }, [userId, fetchBookings]);

  return {
    bookings,
    activeBookings,
    pastBookings,
    isLoading,
    refetch: fetchBookings,
    cancelBooking
  };
};
