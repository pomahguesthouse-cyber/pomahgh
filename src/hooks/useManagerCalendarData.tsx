import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ManagerCalendarRoom {
  id: string;
  name: string;
  room_numbers: string[] | null;
  allotment: number;
  price_per_night: number;
}

export interface ManagerCalendarBooking {
  id: string;
  booking_code: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  check_in: string;
  check_out: string;
  status: string;
  num_guests: number;
  total_price: number;
  allocated_room_number: string | null;
  room_id: string;
  room: {
    id: string;
    name: string;
    room_numbers: string[] | null;
  } | null;
  booking_rooms: Array<{
    id: string;
    room_id: string;
    room_number: string;
    price_per_night: number;
  }>;
}

export interface ManagerCalendarUnavailableDate {
  id: string;
  room_id: string;
  room_number: string | null;
  unavailable_date: string;
  reason: string | null;
}

interface ManagerCalendarData {
  rooms: ManagerCalendarRoom[];
  bookings: ManagerCalendarBooking[];
  unavailableDates: ManagerCalendarUnavailableDate[];
  dateRange: {
    start: string;
    end: string;
  };
  tokenName: string;
}

interface UseManagerCalendarDataOptions {
  token: string;
  startDate?: string;
  endDate?: string;
  enabled?: boolean;
}

export const useManagerCalendarData = ({
  token,
  startDate,
  endDate,
  enabled = true,
}: UseManagerCalendarDataOptions) => {
  return useQuery({
    queryKey: ["manager-calendar", token, startDate, endDate],
    queryFn: async (): Promise<ManagerCalendarData> => {
      const { data, error } = await supabase.functions.invoke("validate-manager-token", {
        body: { token, startDate, endDate },
      });

      if (error) {
        throw new Error(error.message || "Failed to validate token");
      }

      if (!data.success) {
        throw new Error(data.error || "Token validation failed");
      }

      return {
        rooms: data.data.rooms,
        bookings: data.data.bookings,
        unavailableDates: data.data.unavailableDates,
        dateRange: data.data.dateRange,
        tokenName: data.tokenName,
      };
    },
    enabled: enabled && !!token,
    retry: false,
    staleTime: 1000 * 60, // 1 minute
  });
};
