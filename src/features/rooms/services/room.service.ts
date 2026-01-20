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

const getDayPrice = (room: Room, dayOfWeek: number): number => {
  const dayPrices = [
    room.sunday_price,
    room.monday_price,
    room.tuesday_price,
    room.wednesday_price,
    room.thursday_price,
    room.friday_price,
    room.saturday_price,
  ];
  return dayPrices[dayOfWeek] || room.price_per_night;
};

const calculateCurrentPrice = (room: Room, activePromo?: RoomPromotion | null): number => {
  const today = new Date();

  // First priority: Check room_promotions table
  if (activePromo) {
    if (activePromo.promo_price) {
      return activePromo.promo_price;
    }
    if (activePromo.discount_percentage) {
      return room.price_per_night * (1 - activePromo.discount_percentage / 100);
    }
  }

  // Second priority: Check legacy promo fields on rooms table
  if (room.promo_price && room.promo_start_date && room.promo_end_date) {
    const promoStart = new Date(room.promo_start_date);
    const promoEnd = new Date(room.promo_end_date);

    if (today >= promoStart && today <= promoEnd) {
      return room.promo_price;
    }
  }

  // Third priority: Check day-of-week pricing
  const dayOfWeek = today.getDay();
  return getDayPrice(room, dayOfWeek);
};

export const roomService = {
  /**
   * Fetch all available rooms with active promotions
   */
  getAll: async (): Promise<RoomWithPromotion[]> => {
    const today = new Date().toISOString().split("T")[0];

    // Fetch rooms
    const { data: rooms, error: roomsError } = await supabase
      .from("rooms")
      .select("*")
      .eq("available", true)
      .order("price_per_night", { ascending: true });

    if (roomsError) throw roomsError;

    // Fetch active promotions
    const { data: promotions, error: promosError } = await supabase
      .from("room_promotions")
      .select("*")
      .eq("is_active", true)
      .lte("start_date", today)
      .gte("end_date", today)
      .order("priority", { ascending: false });

    if (promosError) throw promosError;

    // Map promotions to rooms
    const promosByRoom = new Map<string, RoomPromotion>();
    promotions?.forEach((promo) => {
      if (!promosByRoom.has(promo.room_id)) {
        promosByRoom.set(promo.room_id, promo as RoomPromotion);
      }
    });

    // Calculate current price for each room
    return (rooms as Room[]).map((room) => {
      const activePromo = promosByRoom.get(room.id) || null;
      return {
        ...room,
        active_promotion: activePromo,
        final_price: calculateCurrentPrice(room, activePromo),
      };
    });
  },

  /**
   * Fetch all rooms including unavailable (for admin)
   */
  getAllAdmin: async (): Promise<Room[]> => {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .order("price_per_night", { ascending: true });

    if (error) throw error;
    return data as Room[];
  },

  /**
   * Fetch room by ID
   */
  getById: async (id: string): Promise<Room> => {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as Room;
  },

  /**
   * Fetch room by slug
   */
  getBySlug: async (slug: string): Promise<Room> => {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error) throw error;
    return data as Room;
  },

  /**
   * Fetch room addons
   */
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

  /**
   * Fetch room panoramas
   */
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

  /**
   * Fetch active promotions for a room
   */
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

  /**
   * Check room availability for date range
   */
  checkAvailability: async (
    roomId: string,
    checkIn: string,
    checkOut: string
  ): Promise<{ available: boolean; bookedNumbers: string[]; availableNumbers: string[] }> => {
    // Get room details
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("room_numbers, allotment")
      .eq("id", roomId)
      .single();

    if (roomError) throw roomError;

    // Get booked rooms for the date range
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("allocated_room_number, booking_rooms(room_number)")
      .eq("room_id", roomId)
      .neq("status", "cancelled")
      .lt("check_in", checkOut)
      .gt("check_out", checkIn);

    if (bookingsError) throw bookingsError;

    // Collect all booked room numbers
    const bookedNumbers = new Set<string>();
    bookings?.forEach((booking) => {
      if (booking.allocated_room_number) {
        bookedNumbers.add(booking.allocated_room_number);
      }
      booking.booking_rooms?.forEach((br) => {
        bookedNumbers.add(br.room_number);
      });
    });

    // Get unavailable dates
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

    // Calculate available rooms
    const allRoomNumbers = room.room_numbers || [];
    const availableNumbers = allRoomNumbers.filter((num) => !bookedNumbers.has(num));

    return {
      available: availableNumbers.length > 0,
      bookedNumbers: Array.from(bookedNumbers),
      availableNumbers,
    };
  },

  /**
   * Get price for specific date
   */
  getPriceForDate: (room: Room, date: Date): number => {
    return getDayPrice(room, date.getDay());
  },

  /**
   * Calculate total price for date range
   */
  calculateTotalPrice: (room: Room, checkIn: Date, checkOut: Date): number => {
    let total = 0;
    const current = new Date(checkIn);

    while (current < checkOut) {
      total += getDayPrice(room, current.getDay());
      current.setDate(current.getDate() + 1);
    }

    return total;
  },
};












