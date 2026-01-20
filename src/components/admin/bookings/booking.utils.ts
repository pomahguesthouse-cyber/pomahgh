import { Booking } from "./types";

/**
 * Get booking source display label
 */
export function getSourceLabel(booking: Booking): string {
  if (booking.booking_source === "ota" && booking.ota_name) {
    return `OTA - ${booking.ota_name}`;
  }
  if (booking.booking_source === "other" && booking.other_source) {
    return booking.other_source;
  }
  const sourceLabels: Record<string, string> = {
    direct: "Direct",
    walk_in: "Walk-in",
    ota: "OTA",
    other: "Lainnya",
  };
  return sourceLabels[booking.booking_source || "direct"] || "Direct";
}

/**
 * Format number Indonesia style (e.g., 700.000)
 */
export function formatNumberID(num: number): string {
  return num.toLocaleString("id-ID");
}
