/**
 * Booking-related TypeScript types
 * Shared between frontend and admin modules
 */

// Booking status options
export type BookingStatus = "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "no_show";

// Payment status options
export type PaymentStatus = "pending" | "paid" | "refunded" | "partial";

// Booking source options
export type BookingSource = "direct" | "ota" | "walk_in" | "other";

// Custom price mode for admin
export type CustomPriceMode = "per_night" | "total";

// Core booking interface
export interface Booking {
  id: string;
  booking_code: string;
  room_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  check_in: string;
  check_out: string;
  check_in_time?: string;
  check_out_time?: string;
  total_nights: number;
  total_price: number;
  num_guests: number;
  status: BookingStatus;
  special_requests?: string;
  created_at: string;
  updated_at?: string;
  allocated_room_number?: string | null;
  payment_status?: PaymentStatus;
  payment_amount?: number;
  booking_source?: BookingSource;
  ota_name?: string | null;
  other_source?: string | null;
  is_non_refundable?: boolean;
  rooms?: {
    name: string;
    room_count: number;
    allotment: number;
  };
  booking_rooms?: BookingRoom[];
}

// Booking room allocation
export interface BookingRoom {
  id: string;
  booking_id?: string;
  room_id: string;
  room_number: string;
  price_per_night: number;
}

// Selected room for booking form
export interface SelectedRoom {
  roomId: string;
  roomNumber: string;
  pricePerNight: number;
}

// Room type availability info
export interface RoomTypeAvailability {
  roomId: string;
  roomName: string;
  allotment: number;
  availableRoomNumbers: string[];
  bookedRoomNumbers: string[];
  pricePerNight: number;
}

// Booking data for creation
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

// Booking addon
export interface BookingAddon {
  addon_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

// Edit booking data for admin
export interface EditBookingData {
  id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  booking_source: string;
  ota_name: string;
  other_source: string;
  check_in: string;
  check_out: string;
  total_nights: number;
  total_price: number;
  status: string;
  payment_status: string;
  payment_amount: number;
  special_requests: string;
  editedRooms: SelectedRoom[];
}
