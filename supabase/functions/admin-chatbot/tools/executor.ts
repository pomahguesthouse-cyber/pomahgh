// ============= EXECUTOR =============
// Tugas:
// - Validasi role
// - Validasi argumen
// - Dispatch tool
// - TIDAK menyimpulkan kondisi hotel

import { getBookingStats, getRecentBookings, searchBookings, getBookingDetail } from "./bookingStats.ts";

import { getAvailabilitySummary } from "./availability.ts";

import { getTodayWIB, getCurrentTimeWIB } from "../lib/dateHelpers.ts";

/* ================= TYPES ================= */

export interface ExecutorArgs {
  period?: "today" | "week" | "month";
  limit?: number;
  status?: "confirmed" | "cancelled" | "checked_in" | "checked_out" | string;
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

// Role yang dianggap setara manager
const MANAGER_ROLES = new Set(["manager", "admin", "owner"]);

function isManagerRole(role: string): boolean {
  return MANAGER_ROLES.has(role);
}

function assertRoleAllowed(toolName: string, role: string) {
  const MANAGER_ONLY_TOOLS = new Set(["booking_stats", "availability"]);

  if (MANAGER_ONLY_TOOLS.has(toolName) && !isManagerRole(role)) {
    throw new Error("Anda tidak memiliki izin untuk mengakses tool ini.");
  }
}

/* ================= INTERNAL EXECUTOR ================= */

async function executeTool(supabase: unknown, toolName: string, args: ExecutorArgs): Promise<ExecutorResult> {
  const client = supabase as any;

  switch (toolName) {
    /* ========= BOOKING STATS ========= */
    case "booking_stats": {
      if (!args.period) {
        throw new Error("period is required for booking_stats");
      }

      const stats = await getBookingStats(client, args.period);

      return {
        type: "stats",
        data: stats,
        note: "Statistik booking berdasarkan waktu pembuatan booking (created_at).",
      };
    }

    /* ========= RECENT BOOKINGS ========= */
    case "recent_bookings": {
      const data = await getRecentBookings(client, args.limit ?? 5, args.status);

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

      const data = await searchBookings(client, args.query, args.date_from, args.date_to, args.limit ?? 10);

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

      const data = await getBookingDetail(client, args.booking_code);

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

      const data = await getAvailabilitySummary(client, args.check_in, args.check_out);

      return {
        type: "availability",
        data,
      };
    }

    /* ========= STAYING TODAY (FIXED) ========= */
    case "staying_today": {
      const today = getTodayWIB(); // YYYY-MM-DD
      const nowTime = getCurrentTimeWIB(); // HH:mm

      // Ambil jam checkout hotel
      const { data: hotelSettings } = await client.from("hotel_settings").select("check_out_time").single();

      const checkoutTime = hotelSettings?.check_out_time ?? "12:00";

      // Status yang dianggap masih aktif/menginap
      const ACTIVE_STATUSES = ["confirmed", "checked_in", "staying", "in_house"];

      const { data, error } = await client
        .from("bookings")
        .select(
          `
          booking_code,
          guest_name,
          guest_phone,
          check_in,
          check_out,
          status,
          allocated_room_number,
          rooms(name)
        `,
        )
        .in("status", ACTIVE_STATUSES);

      if (error) throw error;

      const stayingGuests = (data ?? []).filter((b: any) => {
        // belum check-in
        if (b.check_in > today) return false;

        // checkout masih setelah hari ini
        if (b.check_out > today) return true;

        // checkout hari ini → cek jam
        if (b.check_out === today) {
          return nowTime < checkoutTime;
        }

        return false;
      });

      return {
        type: "list",
        data: stayingGuests,
        note: "Daftar tamu yang sedang menginap hari ini (berdasarkan tanggal & jam checkout).",
      };
    }

    /* ========= UNKNOWN ========= */
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

/* ================= PUBLIC API ================= */

/**
 * DIPANGGIL OLEH index.ts
 * Signature HARUS:
 * (supabase, toolName, args, role: string)
 */
export async function executeToolWithValidation(
  supabase: unknown,
  toolName: string,
  args: ExecutorArgs,
  role: string,
): Promise<ExecutorResult> {
  try {
    // 🔐 Role validation
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
