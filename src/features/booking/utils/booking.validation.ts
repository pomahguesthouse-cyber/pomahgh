/**
 * Booking Validation Helpers
 * Centralized validation logic for bookings
 */

import { differenceInDays, isBefore, isAfter, startOfDay, addDays } from "date-fns";

export interface BookingValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface BookingDates {
  checkIn: Date;
  checkOut: Date;
}

export interface BookingGuestInfo {
  name: string;
  email: string;
  phone?: string;
}

export const bookingValidation = {
  /**
   * Validate booking dates
   */
  validateDates: (dates: BookingDates): BookingValidationResult => {
    const errors: string[] = [];
    const today = startOfDay(new Date());

    // Check-in must be today or in the future
    if (isBefore(startOfDay(dates.checkIn), today)) {
      errors.push("Tanggal check-in tidak boleh di masa lalu");
    }

    // Check-out must be after check-in
    if (!isAfter(dates.checkOut, dates.checkIn)) {
      errors.push("Tanggal check-out harus setelah check-in");
    }

    // Minimum 1 night
    const nights = differenceInDays(dates.checkOut, dates.checkIn);
    if (nights < 1) {
      errors.push("Minimal menginap 1 malam");
    }

    // Maximum stay (e.g., 30 nights)
    if (nights > 30) {
      errors.push("Maksimal menginap 30 malam");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * Validate guest information
   */
  validateGuestInfo: (info: BookingGuestInfo): BookingValidationResult => {
    const errors: string[] = [];

    // Name validation
    if (!info.name || info.name.trim().length < 2) {
      errors.push("Nama tamu minimal 2 karakter");
    }

    if (info.name && info.name.trim().length > 100) {
      errors.push("Nama tamu maksimal 100 karakter");
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!info.email || !emailRegex.test(info.email)) {
      errors.push("Format email tidak valid");
    }

    // Phone validation (optional but if provided, must be valid)
    if (info.phone) {
      const phoneRegex = /^(\+62|62|0)[\d]{9,12}$/;
      const cleanPhone = info.phone.replace(/[\s-]/g, "");
      if (!phoneRegex.test(cleanPhone)) {
        errors.push("Format nomor telepon tidak valid");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * Validate number of guests
   */
  validateGuests: (numGuests: number, maxGuests: number): BookingValidationResult => {
    const errors: string[] = [];

    if (numGuests < 1) {
      errors.push("Minimal 1 tamu");
    }

    if (numGuests > maxGuests) {
      errors.push(`Maksimal ${maxGuests} tamu untuk kamar ini`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * Validate room quantity
   */
  validateRoomQuantity: (quantity: number, available: number): BookingValidationResult => {
    const errors: string[] = [];

    if (quantity < 1) {
      errors.push("Minimal 1 kamar");
    }

    if (quantity > available) {
      errors.push(`Hanya ${available} kamar tersedia`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * Calculate number of nights
   */
  calculateNights: (checkIn: Date, checkOut: Date): number => {
    return Math.max(0, differenceInDays(checkOut, checkIn));
  },

  /**
   * Check if dates overlap
   */
  datesOverlap: (
    range1: BookingDates,
    range2: BookingDates
  ): boolean => {
    return (
      isBefore(range1.checkIn, range2.checkOut) &&
      isAfter(range1.checkOut, range2.checkIn)
    );
  },

  /**
   * Get suggested checkout date
   */
  getSuggestedCheckout: (checkIn: Date, nights: number = 1): Date => {
    return addDays(checkIn, nights);
  },

  /**
   * Validate all booking data
   */
  validateAll: (data: {
    dates: BookingDates;
    guestInfo: BookingGuestInfo;
    numGuests: number;
    maxGuests: number;
    roomQuantity: number;
    availableRooms: number;
  }): BookingValidationResult => {
    const allErrors: string[] = [];

    const dateValidation = bookingValidation.validateDates(data.dates);
    allErrors.push(...dateValidation.errors);

    const guestValidation = bookingValidation.validateGuestInfo(data.guestInfo);
    allErrors.push(...guestValidation.errors);

    const guestsValidation = bookingValidation.validateGuests(data.numGuests, data.maxGuests);
    allErrors.push(...guestsValidation.errors);

    const roomValidation = bookingValidation.validateRoomQuantity(
      data.roomQuantity,
      data.availableRooms
    );
    allErrors.push(...roomValidation.errors);

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
    };
  },
};
