/**
 * Booking Permission Helpers
 * Centralized access control logic for bookings
 */

import type { Booking, BookingStatus, PaymentStatus } from "@/types/booking.types";

export type UserRole = "guest" | "staff" | "manager" | "admin";

export const bookingPermissions = {
  /**
   * Check if user can view booking
   */
  canView: (booking: Booking, userId?: string, role: UserRole = "guest"): boolean => {
    // Admin and manager can view all
    if (role === "admin" || role === "manager") return true;
    // Staff can view all
    if (role === "staff") return true;
    // Guest can only view their own booking (by email match - would need user context)
    return false;
  },

  /**
   * Check if user can edit booking
   */
  canEdit: (booking: Booking, role: UserRole = "guest"): boolean => {
    // Only admin and manager can edit
    if (role !== "admin" && role !== "manager") return false;
    // Cannot edit completed or cancelled bookings
    return !["checked_out", "cancelled"].includes(booking.status);
  },

  /**
   * Check if booking can be cancelled
   */
  canCancel: (booking: Booking, role: UserRole = "guest"): boolean => {
    // Only pending or confirmed bookings can be cancelled
    const cancellableStatuses: BookingStatus[] = ["pending", "confirmed"];
    if (!cancellableStatuses.includes(booking.status)) return false;
    // Admin and manager can always cancel eligible bookings
    if (role === "admin" || role === "manager") return true;
    // Staff cannot cancel
    return false;
  },

  /**
   * Check if booking can be confirmed
   */
  canConfirm: (booking: Booking, role: UserRole = "guest"): boolean => {
    if (booking.status !== "pending") return false;
    return role === "admin" || role === "manager" || role === "staff";
  },

  /**
   * Check if guest can check in
   */
  canCheckIn: (booking: Booking, role: UserRole = "guest"): boolean => {
    if (booking.status !== "confirmed") return false;
    return role === "admin" || role === "manager" || role === "staff";
  },

  /**
   * Check if guest can check out
   */
  canCheckOut: (booking: Booking, role: UserRole = "guest"): boolean => {
    if (booking.status !== "checked_in") return false;
    return role === "admin" || role === "manager" || role === "staff";
  },

  /**
   * Check if booking can be refunded
   */
  canRefund: (booking: Booking, role: UserRole = "guest"): boolean => {
    // Only admin can refund
    if (role !== "admin") return false;
    // Must be paid to refund
    if (booking.payment_status !== "paid") return false;
    // Cannot refund already refunded
    return true;
  },

  /**
   * Check if payment can be recorded
   */
  canRecordPayment: (booking: Booking, role: UserRole = "guest"): boolean => {
    // Only admin and manager can record payment
    if (role !== "admin" && role !== "manager") return false;
    // Cannot record payment for cancelled bookings
    if (booking.status === "cancelled") return false;
    // Can record if not fully paid
    return booking.payment_status !== "paid";
  },

  /**
   * Check if booking can be deleted
   */
  canDelete: (booking: Booking, role: UserRole = "guest"): boolean => {
    // Only admin can delete
    if (role !== "admin") return false;
    // Can only delete cancelled bookings
    return booking.status === "cancelled";
  },

  /**
   * Check if room allocation can be changed
   */
  canChangeRoom: (booking: Booking, role: UserRole = "guest"): boolean => {
    // Only admin and manager can change room
    if (role !== "admin" && role !== "manager") return false;
    // Cannot change room for checked-out or cancelled
    return !["checked_out", "cancelled"].includes(booking.status);
  },

  /**
   * Get available actions for a booking based on role
   */
  getAvailableActions: (booking: Booking, role: UserRole = "guest"): string[] => {
    const actions: string[] = [];

    if (bookingPermissions.canView(booking, undefined, role)) actions.push("view");
    if (bookingPermissions.canEdit(booking, role)) actions.push("edit");
    if (bookingPermissions.canConfirm(booking, role)) actions.push("confirm");
    if (bookingPermissions.canCheckIn(booking, role)) actions.push("check_in");
    if (bookingPermissions.canCheckOut(booking, role)) actions.push("check_out");
    if (bookingPermissions.canCancel(booking, role)) actions.push("cancel");
    if (bookingPermissions.canRecordPayment(booking, role)) actions.push("record_payment");
    if (bookingPermissions.canRefund(booking, role)) actions.push("refund");
    if (bookingPermissions.canChangeRoom(booking, role)) actions.push("change_room");
    if (bookingPermissions.canDelete(booking, role)) actions.push("delete");

    return actions;
  },
};












