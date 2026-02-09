// Room information
export interface RoomInfo {
  id: string;
  name: string;
  price_per_night: number;
  allotment: number;
  room_numbers: string[];
  max_guests: number;
  size_sqm?: number;
  description?: string;
  features?: string[];
}

// Room selection for booking
export interface RoomSelection {
  room_name: string;
  quantity: number;
}

// Matched room with availability info
export interface MatchedRoom {
  roomId: string;
  roomName: string;
  pricePerNight: number;
  quantity: number;
  availableNumbers: string[];
}

// Booking result returned to client
export interface BookingResult {
  message: string;
  booking_code: string;
  rooms_booked: string[];
  total_rooms: number;
  total_price: number;
  status: string;
  is_update: boolean;
}

// Availability query parameters
export interface AvailabilityQuery {
  roomId: string;
  roomNumbers: string[];
  checkIn: string;
  checkOut: string;
  excludeBookingId?: string;
}

// Availability result
export interface AvailabilityResult {
  available: string[];
  unavailable: Set<string>;
}

// Booking code parse result
export interface BookingCodeParseResult {
  valid: boolean;
  normalized: string | null;
  error?: string;
}

// Date validation result with warning flag
export interface DateValidationResult {
  date: string;
  wasFixed: boolean;
  warning?: string;
}

// WhatsApp message payload
export interface WhatsAppMessagePayload {
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  roomsText: string;
  totalRooms: number;
  checkIn: string;
  checkOut: string;
  numGuests: number;
  totalNights: number;
  totalPrice: number;
  bookingCode: string;
  hotelName?: string;
  status?: string;
}

// Create booking parameters
export interface CreateBookingParams {
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  check_in: string;
  check_out: string;
  room_name?: string;
  room_selections?: RoomSelection[];
  num_guests?: number;
  special_requests?: string;
}

// Update booking parameters
export interface UpdateBookingParams {
  booking_id: string;
  guest_phone: string;
  guest_email: string;
  new_check_in?: string;
  new_check_out?: string;
  new_num_guests?: number;
  new_special_requests?: string;
}

// Get booking details parameters
export interface GetBookingParams {
  booking_id: string;
  guest_phone: string;
  guest_email: string;
}

// Check availability parameters
export interface CheckAvailabilityParams {
  check_in: string;
  check_out: string;
  num_guests?: number;
}

// Get room details parameters
export interface GetRoomDetailsParams {
  room_name: string;
}

// Get payment methods parameters
export interface GetPaymentMethodsParams {
  booking_id: string;
  guest_phone: string;
  guest_email: string;
}
