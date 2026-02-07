/**
 * Booking Data Mapper
 * Transforms database entities to DTOs and vice versa
 */

import type {
  Booking,
  BookingRoom,
  BookingStatus,
  PaymentStatus,
} from "@/types/booking.types";
import { formatRupiah } from "@/lib/format/currency";
import { formatDate, formatDateRange } from "@/lib/format/date";

// DTO for frontend display (camelCase)
export interface BookingDTO {
  id: string;
  bookingCode: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  roomId: string;
  roomName: string;
  checkIn: Date;
  checkOut: Date;
  checkInTime: string;
  checkOutTime: string;
  totalNights: number;
  totalPrice: number;
  formattedPrice: string;
  numGuests: number;
  status: BookingStatus;
  statusLabel: string;
  paymentStatus: PaymentStatus;
  paymentStatusLabel: string;
  paymentAmount: number;
  specialRequests: string;
  allocatedRoomNumber: string | null;
  bookingSource: string;
  otaName: string | null;
  isNonRefundable: boolean;
  createdAt: Date;
  rooms: BookingRoomDTO[];
}

export interface BookingRoomDTO {
  id: string;
  roomNumber: string;
  pricePerNight: number;
  formattedPrice: string;
}

// List item for tables/cards
export interface BookingListItem {
  id: string;
  code: string;
  guest: string;
  guestPhone: string;
  dates: string;
  nights: number;
  status: BookingStatus;
  statusLabel: string;
  paymentStatus: PaymentStatus;
  amount: string;
  roomName: string;
  roomNumbers: string;
}

// Calendar item
export interface BookingCalendarItem {
  id: string;
  bookingCode: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  status: BookingStatus;
  roomNumber: string;
  roomId: string;
}

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Menunggu",
  confirmed: "Dikonfirmasi",
  checked_in: "Check-in",
  checked_out: "Check-out",
  cancelled: "Dibatalkan",
  no_show: "No Show",
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Belum Bayar",
  paid: "Lunas",
  refunded: "Refund",
  partial: "Sebagian",
};

export const bookingMapper = {
  /**
   * Transform database entity to full DTO
   */
  toDTO: (entity: Booking): BookingDTO => ({
    id: entity.id,
    bookingCode: entity.booking_code,
    guestName: entity.guest_name,
    guestEmail: entity.guest_email,
    guestPhone: entity.guest_phone || "",
    roomId: entity.room_id,
    roomName: entity.rooms?.name || "",
    checkIn: new Date(entity.check_in),
    checkOut: new Date(entity.check_out),
    checkInTime: entity.check_in_time || "14:00",
    checkOutTime: entity.check_out_time || "12:00",
    totalNights: entity.total_nights,
    totalPrice: entity.total_price,
    formattedPrice: formatRupiah(entity.total_price),
    numGuests: entity.num_guests,
    status: entity.status,
    statusLabel: STATUS_LABELS[entity.status] || entity.status,
    paymentStatus: entity.payment_status || "pending",
    paymentStatusLabel: PAYMENT_STATUS_LABELS[entity.payment_status || "pending"],
    paymentAmount: entity.payment_amount || 0,
    specialRequests: entity.special_requests || "",
    allocatedRoomNumber: entity.allocated_room_number ?? null,
    bookingSource: entity.booking_source || "direct",
    otaName: entity.ota_name ?? null,
    isNonRefundable: entity.is_non_refundable || false,
    createdAt: new Date(entity.created_at),
    rooms: entity.booking_rooms?.map(bookingMapper.toRoomDTO) || [],
  }),

  /**
   * Transform booking room to DTO
   */
  toRoomDTO: (room: BookingRoom): BookingRoomDTO => ({
    id: room.id,
    roomNumber: room.room_number,
    pricePerNight: room.price_per_night,
    formattedPrice: formatRupiah(room.price_per_night),
  }),

  /**
   * Transform to list item for tables
   */
  toListItem: (entity: Booking): BookingListItem => {
    const roomNumbers = entity.booking_rooms
      ?.map((r) => r.room_number)
      .join(", ") || entity.allocated_room_number || "-";

    return {
      id: entity.id,
      code: entity.booking_code,
      guest: entity.guest_name,
      guestPhone: entity.guest_phone || "",
      dates: formatDateRange(new Date(entity.check_in), new Date(entity.check_out)),
      nights: entity.total_nights,
      status: entity.status,
      statusLabel: STATUS_LABELS[entity.status] || entity.status,
      paymentStatus: entity.payment_status || "pending",
      amount: formatRupiah(entity.total_price),
      roomName: entity.rooms?.name || "",
      roomNumbers,
    };
  },

  /**
   * Transform to calendar item
   */
  toCalendarItem: (entity: Booking): BookingCalendarItem => ({
    id: entity.id,
    bookingCode: entity.booking_code,
    guestName: entity.guest_name,
    checkIn: entity.check_in,
    checkOut: entity.check_out,
    status: entity.status,
    roomNumber: entity.allocated_room_number || "",
    roomId: entity.room_id,
  }),

  /**
   * Transform multiple entities to DTOs
   */
  toDTOList: (entities: Booking[]): BookingDTO[] => 
    entities.map(bookingMapper.toDTO),

  /**
   * Transform multiple entities to list items
   */
  toListItems: (entities: Booking[]): BookingListItem[] =>
    entities.map(bookingMapper.toListItem),

  /**
   * Transform multiple entities to calendar items
   */
  toCalendarItems: (entities: Booking[]): BookingCalendarItem[] =>
    entities.map(bookingMapper.toCalendarItem),

  /**
   * Get status label
   */
  getStatusLabel: (status: BookingStatus): string => 
    STATUS_LABELS[status] || status,

  /**
   * Get payment status label
   */
  getPaymentStatusLabel: (status: PaymentStatus): string =>
    PAYMENT_STATUS_LABELS[status] || status,
};
