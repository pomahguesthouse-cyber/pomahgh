/**
 * Room Service Layer
 * Centralizes all Supabase operations for rooms
 */

import { supabase } from "@/integrations/supabase/client";
import type { Room, RoomPromotion, RoomAddon, RoomPanorama } from "@/types/room.types";

export interface RoomWithPromotion extends Room {
  active_promotion: RoomPromotion | null;
  final_price: number;
}

const calculateCurrentPrice = (room: Room, activePromo?: RoomPromotion | null): number => {
  // Check active promotion from room_promotions table
  if (activePromo) {
    if (activePromo.promo_price) {
      return activePromo.promo_price;
    }
    if (activePromo.discount_percentage) {
      return room.price_per_night * (1 - activePromo.discount_percentage / 100);
    }
  }

  return room.price_per_night;
};

export const roomService = {
  getAll: async (): Promise<RoomWithPromotion[]> => {
    const today = new Date().toISOString().split("T")[0];

    const { data: rooms, error: roomsError } = await supabase
      .from("rooms")
      .select("*")
      .eq("available", true)
      .order("price_per_night", { ascending: true });

    if (roomsError) throw roomsError;

    const { data: promotions, error: promosError } = await supabase
      .from("room_promotions")
      .select("*")
      .eq("is_active", true)
      .lte("start_date", today)
      .gte("end_date", today)
      .order("priority", { ascending: false });

    if (promosError) throw promosError;

    const promosByRoom = new Map<string, RoomPromotion>();
    promotions?.forEach((promo) => {
      if (!promosByRoom.has(promo.room_id)) {
        promosByRoom.set(promo.room_id, promo as RoomPromotion);
      }
    });

    return (rooms as Room[]).map((room) => {
      const activePromo = promosByRoom.get(room.id) || null;
      return {
        ...room,
        active_promotion: activePromo,
        final_price: calculateCurrentPrice(room, activePromo),
      };
    });
  },

  getAllAdmin: async (): Promise<Room[]> => {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .order("price_per_night", { ascending: true });

    if (error) throw error;
    return data as Room[];
  },

  getById: async (id: string): Promise<Room> => {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as Room;
  },

  getBySlug: async (slug: string): Promise<Room> => {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error) throw error;
    return data as Room;
  },

  getAddons: async (roomId?: string): Promise<RoomAddon[]> => {
    let query = supabase
      .from("room_addons")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (roomId) {
      query = query.or(`room_id.eq.${roomId},room_id.is.null`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as RoomAddon[];
  },

  getPanoramas: async (roomId: string): Promise<RoomPanorama[]> => {
    const { data, error } = await supabase
      .from("room_panoramas")
      .select("*")
      .eq("room_id", roomId)
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) throw error;
    return data as RoomPanorama[];
  },

  getActivePromotions: async (roomId: string): Promise<RoomPromotion[]> => {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("room_promotions")
      .select("*")
      .eq("room_id", roomId)
      .eq("is_active", true)
      .lte("start_date", today)
      .gte("end_date", today)
      .order("priority", { ascending: false });

    if (error) throw error;
    return data as RoomPromotion[];
  },

  checkAvailability: async (
    roomId: string,
    checkIn: string,
    checkOut: string
  ): Promise<{ available: boolean; bookedNumbers: string[]; availableNumbers: string[] }> => {
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("room_numbers, allotment")
      .eq("id", roomId)
      .single();

    if (roomError) throw roomError;

    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("allocated_room_number, booking_rooms(room_number)")
      .eq("room_id", roomId)
      .neq("status", "cancelled")
      .lt("check_in", checkOut)
      .gt("check_out", checkIn);

    if (bookingsError) throw bookingsError;

    const bookedNumbers = new Set<string>();
    bookings?.forEach((booking) => {
      if (booking.allocated_room_number) {
        bookedNumbers.add(booking.allocated_room_number);
      }
      booking.booking_rooms?.forEach((br) => {
        bookedNumbers.add(br.room_number);
      });
    });

    const { data: unavailable, error: unavailableError } = await supabase
      .from("room_unavailable_dates")
      .select("room_number")
      .eq("room_id", roomId)
      .gte("unavailable_date", checkIn)
      .lt("unavailable_date", checkOut);

    if (unavailableError) throw unavailableError;

    unavailable?.forEach((u) => {
      if (u.room_number) bookedNumbers.add(u.room_number);
    });

    const allRoomNumbers = room.room_numbers || [];
    const availableNumbers = allRoomNumbers.filter((num) => !bookedNumbers.has(num));

    return {
      available: availableNumbers.length > 0,
      bookedNumbers: Array.from(bookedNumbers),
      availableNumbers,
    };
  },

  getPriceForDate: (room: Room, _date: Date): number => {
    return room.price_per_night;
  },

  calculateTotalPrice: (room: Room, checkIn: Date, checkOut: Date): number => {
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    return room.price_per_night * nights;
  },
};
