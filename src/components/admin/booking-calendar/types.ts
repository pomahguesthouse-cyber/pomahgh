import { IndonesianHoliday } from "@/utils/indonesianHolidays";

export interface Booking {
  id: string;
  room_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string | null;
  check_in: string;
  check_out: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  total_nights: number;
  total_price: number;
  num_guests: number;
  status: string;
  special_requests?: string | null;
  created_at: string;
  allocated_room_number?: string | null;
  payment_status?: string | null;
  payment_amount?: number | null;
  booking_source?: string | null;
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

export interface RoomInfo {
  roomType: string;
  roomNumber: string;
  roomId: string;
}

export type ViewRange = 7 | 14 | 30;

export interface BlockDialogState {
  open: boolean;
  roomId?: string;
  roomNumber?: string;
  date?: Date;
  endDate?: Date;
  reason?: string;
}

export interface CreateBookingDialogState {
  open: boolean;
  roomId?: string;
  roomNumber?: string;
  date?: Date;
}

export interface ContextMenuState {
  roomId: string;
  roomNumber: string;
  date: Date;
  x: number;
  y: number;
}

export const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
