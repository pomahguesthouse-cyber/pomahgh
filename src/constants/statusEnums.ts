/**
 * HTTP Status Codes & Error Status Constants
 */

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const BOOKING_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CHECKED_IN: "checked_in",
  CHECKED_OUT: "checked_out",
  CANCELLED: "cancelled",
  FAILED: "failed",
} as const;

export const PAYMENT_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
} as const;

export const USER_ROLE = {
  ADMIN: "admin",
  STAFF: "staff",
  GUEST: "guest",
} as const;

export const ROOM_STATUS = {
  AVAILABLE: "available",
  OCCUPIED: "occupied",
  MAINTENANCE: "maintenance",
  BLOCKED: "blocked",
} as const;
