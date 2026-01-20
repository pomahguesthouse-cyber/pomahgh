import { BookingStatus, PaymentStatus } from "./booking.constants";

// Booking type - matches the interface in useAdminBookings
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
  remark?: string;
  created_at: string;
  allocated_room_number?: string | null;
  payment_status?: PaymentStatus;
  payment_amount?: number;
  booking_source?: "direct" | "ota" | "walk_in" | "other";
  ota_name?: string | null;
  other_source?: string | null;
  rooms?: {
    name: string;
    room_count: number;
    allotment: number;
  };
  booking_rooms?: Array<{
    id: string;
    room_id: string;
    room_number: string;
    price_per_night: number;
  }>;
}

export interface SelectedRoom {
  roomId: string;
  roomNumber: string;
  pricePerNight: number;
}

export interface Room {
  id: string;
  name: string;
  price: number;
  allotment: number;
  room_numbers?: string[];
}

export interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder_name: string;
  is_active: boolean;
}

export interface RoomTypeAvailability {
  roomId: string;
  roomName: string;
  allotment: number;
  availableRoomNumbers: string[];
  bookedRoomNumbers: string[];
  pricePerNight: number;
}

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

export type BookingSource = "direct" | "ota" | "walk_in" | "other";
export type CustomPriceMode = "per_night" | "total";












