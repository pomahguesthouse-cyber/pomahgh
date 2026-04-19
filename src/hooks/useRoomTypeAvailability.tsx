import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface RoomTypeAvailability {
  roomId: string;
  roomName: string;
  totalRooms: number;
  availableRooms: string[];
  availableCount: number;
  pricePerNight: number;
}

/**
 * Hitung ketersediaan tiap tipe kamar untuk rentang tanggal.
 *
 * Bug fix:
 *  - Bug 3: `excludeBookingId` sekarang benar-benar dipakai untuk meng-exclude
 *    booking yang sedang di-edit dari kalkulasi konflik.
 *  - Bug 4: query `booking_rooms` (multi-room) ikut diperhitungkan, bukan hanya
 *    `allocated_room_number` di tabel `bookings`.
 *  - Bug 8: overlap pakai strict `lt(checkOut)` & `gt(checkIn)` — konsisten
 *    dengan room.service.ts (same-day turnover sah).
 *  - Bug 9: tambahkan query `room_unavailable_dates` (block null = block semua
 *    nomor dari tipe tersebut).
 */
export const useRoomTypeAvailability = (
  checkIn: Date | null,
  checkOut: Date | null,
  excludeBookingId?: string
) => {
  return useQuery({
    queryKey: ["room-type-availability", checkIn, checkOut, excludeBookingId],
    queryFn: async () => {
      if (!checkIn || !checkOut) return [];

      const checkInStr = format(checkIn, "yyyy-MM-dd");
      const checkOutStr = format(checkOut, "yyyy-MM-dd");

      // 1) Tipe kamar
      const { data: rooms, error: roomsError } = await supabase
        .from("rooms")
        .select("id, name, room_numbers, price_per_night, allotment")
        .eq("available", true)
        .order("name");

      if (roomsError) throw roomsError;
      if (!rooms) return [];

      // 2) Booking yang overlap (strict — sama tanggal turnover bukan konflik)
      let bookingsQuery = supabase
        .from("bookings")
        .select("id, room_id, allocated_room_number")
        .neq("status", "cancelled")
        .lt("check_in", checkOutStr)
        .gt("check_out", checkInStr);

      if (excludeBookingId) {
        bookingsQuery = bookingsQuery.neq("id", excludeBookingId);
      }

      const { data: bookings, error: bookingsError } = await bookingsQuery;
      if (bookingsError) throw bookingsError;

      // 3) booking_rooms (multi-room) — ikutkan dalam perhitungan unavailable
      let brQuery = supabase
        .from("booking_rooms")
        .select(`
          room_id,
          room_number,
          booking_id,
          bookings!inner(id, status, check_in, check_out)
        `)
        .neq("bookings.status", "cancelled")
        .lt("bookings.check_in", checkOutStr)
        .gt("bookings.check_out", checkInStr);

      if (excludeBookingId) {
        brQuery = brQuery.neq("booking_id", excludeBookingId);
      }

      const { data: bookingRoomsData, error: brError } = await brQuery;
      if (brError) throw brError;

      // 4) room_unavailable_dates (manual block oleh admin)
      const { data: blockedDates, error: blockedError } = await supabase
        .from("room_unavailable_dates")
        .select("room_id, room_number, unavailable_date")
        .gte("unavailable_date", checkInStr)
        .lt("unavailable_date", checkOutStr);

      if (blockedError) throw blockedError;

      // Build set of unavailable per room type
      const availability: RoomTypeAvailability[] = rooms.map((room) => {
        const roomNumbers = room.room_numbers || [];
        const unavailable = new Set<string>();

        // From bookings.allocated_room_number
        (bookings || [])
          .filter((b) => b.room_id === room.id && b.allocated_room_number)
          .forEach((b) => unavailable.add(b.allocated_room_number as string));

        // From booking_rooms (multi-room)
        ((bookingRoomsData || []) as Array<{ room_id: string; room_number: string | null }>)
          .filter((br) => br.room_id === room.id && br.room_number)
          .forEach((br) => unavailable.add(br.room_number as string));

        // From room_unavailable_dates
        (blockedDates || [])
          .filter((bd) => bd.room_id === room.id)
          .forEach((bd) => {
            if (!bd.room_number) {
              // Null = block semua nomor tipe ini
              roomNumbers.forEach((rn) => unavailable.add(rn));
            } else {
              unavailable.add(bd.room_number);
            }
          });

        const availableRooms = roomNumbers.filter((rn) => !unavailable.has(rn));

        return {
          roomId: room.id,
          roomName: room.name,
          totalRooms: roomNumbers.length,
          availableRooms,
          availableCount: availableRooms.length,
          pricePerNight: room.price_per_night,
        };
      });

      return availability;
    },
    enabled: !!checkIn && !!checkOut,
  });
};
