/**
 * Booking Service Layer
 * Centralizes all Supabase operations for bookings
 */

import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";
import { formatWIBDate } from "@/utils/wibTimezone";
import type { Booking, BookingStatus, PaymentStatus } from "@/types/booking.types";

export interface CreateBookingInput {
  roomId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: Date;
  checkOut: Date;
  checkInTime?: string;
  checkOutTime?: string;
  numGuests: number;
  specialRequests?: string;
  pricePerNight: number;
  roomQuantity?: number;
  isNonRefundable?: boolean;
  addons?: Array<{
    addonId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

export interface UpdateBookingInput {
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  checkIn?: string;
  checkOut?: string;
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  paymentAmount?: number;
  specialRequests?: string;
  bookingSource?: string;
  otaName?: string;
  otherSource?: string;
}

export const bookingService = {
  /**
   * Fetch all bookings with room details
   */
  getAll: async (): Promise<Booking[]> => {
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        rooms:room_id (name, room_count, allotment),
        booking_rooms (id, room_id, room_number, price_per_night)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as Booking[];
  },

  /**
   * Fetch booking by ID
   */
  getById: async (id: string): Promise<Booking> => {
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        rooms:room_id (name, room_count, allotment),
        booking_rooms (id, room_id, room_number, price_per_night)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as Booking;
  },

  /**
   * Fetch booking by booking code
   */
  getByCode: async (bookingCode: string): Promise<Booking> => {
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        rooms:room_id (name, room_count, allotment),
        booking_rooms (id, room_id, room_number, price_per_night)
      `)
      .eq("booking_code", bookingCode)
      .single();

    if (error) throw error;
    return data as Booking;
  },

  /**
   * Fetch bookings by date range
   */
  getByDateRange: async (startDate: string, endDate: string): Promise<Booking[]> => {
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        rooms:room_id (name, room_count, allotment),
        booking_rooms (id, room_id, room_number, price_per_night)
      `)
      .gte("check_in", startDate)
      .lte("check_out", endDate)
      .neq("status", "cancelled")
      .order("check_in", { ascending: true });

    if (error) throw error;
    return data as Booking[];
  },

  /**
   * Create a new booking
   */
  create: async (input: CreateBookingInput, availableRoomNumbers: string[]): Promise<Booking> => {
    const roomQuantity = input.roomQuantity || 1;
    const totalNights = differenceInDays(input.checkOut, input.checkIn);
    const roomPrice = totalNights * input.pricePerNight * roomQuantity;
    const addonsPrice = input.addons?.reduce((sum, addon) => sum + addon.totalPrice, 0) || 0;
    const totalPrice = roomPrice + addonsPrice;

    // Create main booking
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        room_id: input.roomId,
        guest_name: input.guestName,
        guest_email: input.guestEmail,
        guest_phone: input.guestPhone,
        check_in: formatWIBDate(input.checkIn),
        check_out: formatWIBDate(input.checkOut),
        check_in_time: input.checkInTime || "14:00:00",
        check_out_time: input.checkOutTime || "12:00:00",
        total_nights: totalNights,
        total_price: totalPrice,
        num_guests: input.numGuests,
        special_requests: input.specialRequests,
        status: "pending",
        allocated_room_number: availableRoomNumbers[0],
        is_non_refundable: input.isNonRefundable || false,
        booking_source: "other",
        other_source: "Website",
      })
      .select()
      .single();

    if (error) throw error;

    // Insert booking rooms
    if (roomQuantity > 0 && availableRoomNumbers.length > 0) {
      const bookingRoomsData = availableRoomNumbers.slice(0, roomQuantity).map(roomNumber => ({
        booking_id: data.id,
        room_id: input.roomId,
        room_number: roomNumber,
        price_per_night: input.pricePerNight,
      }));

      const { error: bookingRoomsError } = await supabase
        .from("booking_rooms")
        .insert(bookingRoomsData);

      if (bookingRoomsError) {
        console.error("Failed to insert booking_rooms:", bookingRoomsError);
      }
    }

    // Insert booking addons
    if (input.addons && input.addons.length > 0) {
      const bookingAddonsData = input.addons.map(addon => ({
        booking_id: data.id,
        addon_id: addon.addonId,
        quantity: addon.quantity,
        unit_price: addon.unitPrice,
        total_price: addon.totalPrice,
      }));

      const { error: addonsError } = await supabase
        .from("booking_addons")
        .insert(bookingAddonsData);

      if (addonsError) {
        console.error("Failed to insert booking_addons:", addonsError);
      }
    }

    return data as Booking;
  },

  /**
   * Update booking
   */
  update: async (id: string, input: UpdateBookingInput): Promise<Booking> => {
    const updateData: Record<string, unknown> = {};

    if (input.guestName !== undefined) updateData.guest_name = input.guestName;
    if (input.guestEmail !== undefined) updateData.guest_email = input.guestEmail;
    if (input.guestPhone !== undefined) updateData.guest_phone = input.guestPhone;
    if (input.checkIn !== undefined) updateData.check_in = input.checkIn;
    if (input.checkOut !== undefined) updateData.check_out = input.checkOut;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.paymentStatus !== undefined) updateData.payment_status = input.paymentStatus;
    if (input.paymentAmount !== undefined) updateData.payment_amount = input.paymentAmount;
    if (input.specialRequests !== undefined) updateData.special_requests = input.specialRequests;
    if (input.bookingSource !== undefined) updateData.booking_source = input.bookingSource;
    if (input.otaName !== undefined) updateData.ota_name = input.otaName;
    if (input.otherSource !== undefined) updateData.other_source = input.otherSource;

    const { data, error } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Booking;
  },

  /**
   * Update booking status
   */
  updateStatus: async (id: string, status: BookingStatus): Promise<Booking> => {
    const { data, error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Booking;
  },

  /**
   * Update payment status
   */
  updatePaymentStatus: async (
    id: string,
    paymentStatus: PaymentStatus,
    paymentAmount?: number
  ): Promise<Booking> => {
    const updateData: Record<string, unknown> = { payment_status: paymentStatus };
    if (paymentAmount !== undefined) {
      updateData.payment_amount = paymentAmount;
    }

    const { data, error } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Booking;
  },

  /**
   * Cancel booking
   */
  cancel: async (id: string): Promise<Booking> => {
    return bookingService.updateStatus(id, "cancelled");
  },

  /**
   * Check in booking
   */
  checkIn: async (id: string): Promise<Booking> => {
    return bookingService.updateStatus(id, "checked_in");
  },

  /**
   * Check out booking
   */
  checkOut: async (id: string): Promise<Booking> => {
    return bookingService.updateStatus(id, "checked_out");
  },

  /**
   * Notify managers about new booking
   */
  notifyManagers: async (booking: Booking, roomName: string): Promise<void> => {
    await supabase.functions.invoke("notify-new-booking", {
      body: {
        booking_code: booking.booking_code,
        guest_name: booking.guest_name,
        guest_phone: booking.guest_phone,
        room_name: roomName,
        room_number: booking.allocated_room_number,
        check_in: booking.check_in,
        check_out: booking.check_out,
        total_nights: booking.total_nights,
        num_guests: booking.num_guests,
        total_price: booking.total_price,
        booking_source: booking.booking_source || "other",
        other_source: booking.other_source || "Website",
      },
    });
  },
};












