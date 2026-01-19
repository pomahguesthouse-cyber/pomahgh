// ============= EXECUTOR =============
// Bertugas:
// - Validasi argumen tool
// - Memanggil tool yang tepat
// - TIDAK menyimpulkan kondisi hotel

import { getBookingStats, getRecentBookings, searchBookings, getBookingDetail } from "./bookingStats.ts";

import { getAvailabilitySummary } from "./availability.ts";

/* ================= TYPES ================= */

export interface ExecutorArgs {
  period?: "today" | "week" | "month";
  limit?: number;
  status?: "confirmed" | "cancelled" | "checked_in" | "checked_out";
  query?: string;
  date_from?: string;
  date_to?: string;
  check_in?: string;
  check_out?: string;
  booking_code?: string;
}

export interface ExecutorResult {
  type: "stats" | "list" | "detail" | "availability";
  data: unknown;
  note?: string;
}

/* ================= INTERNAL EXECUTOR ================= */

async function executeTool(supabase: unknown, toolName: string, args: ExecutorArgs): Promise<ExecutorResult> {
  switch (toolName) {
    /* ========= BOOKING STATS ========= */
    case "booking_stats": {
      if (!args.period) {
        throw new Error("period is required for booking_stats");
      }

      const stats = await getBookingStats(supabase, args.period);

      return {
        type: "stats",
        data: stats,
        note: "Statistik berdasarkan waktu pembuatan booking (created_at), bukan kondisi tamu menginap.",
      };
    }

    /* ========= RECENT BOOKINGS ========= */
    case "recent_bookings": {
      const data = await getRecentBookings(supabase, args.limit ?? 5, args.status);

      return {
        type: "list",
        data,
      };
    }

    /* ========= SEARCH BOOKINGS ========= */
    case "search_bookings": {
      if (!args.query) {
        throw new Error("query is required for search_bookings");
      }

      const data = await searchBookings(supabase, args.query, args.date_from, args.date_to, args.limit ?? 10);

      return {
        type: "list",
        data,
      };
    }

    /* ========= BOOKING DETAIL ========= */
    case "booking_detail": {
      if (!args.booking_code) {
        throw new Error("booking_code is required");
      }

      const data = await getBookingDetail(supabase, args.booking_code);

      return {
        type: "detail",
        data,
      };
    }

    /* ========= AVAILABILITY ========= */
    case "availability": {
      if (!args.check_in || !args.check_out) {
        throw new Error("check_in and check_out are required for availability");
      }

      const data = await getAvailabilitySummary(supabase, args.check_in, args.check_out);

      return {
        type: "availability",
        data,
      };
    }

    /* ========= UNKNOWN ========= */
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

/* ================= PUBLIC API ================= */

/**
 * Ini fungsi yang DIPAKAI oleh index.ts
 * Bertugas:
 * - Validasi tool name
 * - Guard error supaya chatbot tidak crash
 */
export async function executeToolWithValidation(
  supabase: unknown,
  toolName: string,
  args: ExecutorArgs,
): Promise<ExecutorResult> {
  try {
    return await executeTool(supabase, toolName, args);
  } catch (err) {
    return {
      type: "detail",
      data: {
        error: err instanceof Error ? err.message : "Unknown error",
        tool: toolName,
        args,
      },
      note: "Terjadi kesalahan saat menjalankan tool.",
    };
  }
}
