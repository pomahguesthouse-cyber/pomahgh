// ============= EXECUTOR =============
// - Role-aware (string-based)
// - Argument-safe
// - Tidak menyimpulkan kondisi hotel

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
  type: "stats" | "list" | "detail" | "availability" | "error";
  data: unknown;
  note?: string;
}

/* ================= ROLE GUARD ================= */

// Role yang dianggap punya hak manager
const MANAGER_ROLES = new Set(["manager", "admin", "owner"]);

function isManagerRole(role: string): boolean {
  return MANAGER_ROLES.has(role);
}

function assertRoleAllowed(toolName: string, role: string) {
  const managerOnlyTools = new Set(["booking_stats", "availability"]);

  if (managerOnlyTools.has(toolName) && !isManagerRole(role)) {
    throw new Error("Anda tidak memiliki izin untuk mengakses tool ini.");
  }
}

/* ================= INTERNAL EXECUTOR ================= */

async function executeTool(supabase: unknown, toolName: string, args: ExecutorArgs): Promise<ExecutorResult> {
  switch (toolName) {
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

    case "recent_bookings": {
      const data = await getRecentBookings(supabase, args.limit ?? 5, args.status);

      return {
        type: "list",
        data,
      };
    }

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

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

/* ================= PUBLIC API ================= */

/**
 * DIPANGGIL OLEH index.ts
 * Signature MATCH:
 * (supabase, toolName, args, role: string)
 */
export async function executeToolWithValidation(
  supabase: unknown,
  toolName: string,
  args: ExecutorArgs,
  role: string,
): Promise<ExecutorResult> {
  try {
    // 🔐 Role validation (string-based)
    assertRoleAllowed(toolName, role);

    return await executeTool(supabase, toolName, args);
  } catch (err) {
    return {
      type: "error",
      data: {
        message: err instanceof Error ? err.message : "Unknown executor error",
        tool: toolName,
        args,
        role,
      },
      note: "Gagal menjalankan tool.",
    };
  }
}
