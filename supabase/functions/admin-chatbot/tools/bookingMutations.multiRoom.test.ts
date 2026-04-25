// ============= E2E TEST: Multi-room admin booking =============
// Skenario: admin WhatsApp meminta 2 kamar (tipe berbeda) untuk tanggal yang sama
// → harus menghasilkan SATU booking dengan booking_rooms terisi 2 baris
// (sesuai arsitektur multi-room — lihat mem://features/multi-room-booking-architecture)

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createAdminBooking } from "./bookingMutations.ts";

type Row = Record<string, unknown>;

interface FakeState {
  rooms: Row[];
  bookings: Row[];
  booking_rooms: Row[];
  room_unavailable_dates: Row[];
  room_promotions: Row[];
  bookingIdCounter: number;
  notifyInvocations: Array<Record<string, unknown>>;
}

function createFakeSupabase(state: FakeState) {
  const matchOverlap = (
    rowCheckIn: string,
    rowCheckOut: string,
    qIn: string,
    qOut: string,
  ) => rowCheckIn < qOut && rowCheckOut > qIn;

  return {
    from: vi.fn((table: string) => {
      if (table === "rooms") {
        const builder: Row = {
          select: vi.fn(() => builder),
          eq: vi.fn(() => Promise.resolve({ data: state.rooms, error: null })),
        };
        return builder;
      }

      if (table === "room_promotions") {
        const builder: Row = {
          select: vi.fn(() => builder),
          eq: vi.fn(() => builder),
          lte: vi.fn(() => builder),
          gte: vi.fn(() => builder),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        };
        return builder;
      }

      if (table === "bookings") {
        const builder: Row = {
          // SELECT chain (used to find conflicting bookings)
          select: vi.fn(() => {
            const filters: Row = { room_id: undefined, status_neq: undefined, lt: undefined, gt: undefined };
            const sb: Row = {
              eq: vi.fn((col: string, val: unknown) => {
                if (col === "room_id") filters.room_id = val;
                return sb;
              }),
              neq: vi.fn((col: string, val: unknown) => {
                if (col === "status") filters.status_neq = val;
                return sb;
              }),
              lt: vi.fn((_col: string, val: unknown) => { filters.lt = val; return sb; }),
              gt: vi.fn((_col: string, val: unknown) => { filters.gt = val; return sb; }),
              then: (resolve: (v: unknown) => void) => {
                const data = state.bookings.filter((b) =>
                  b.room_id === filters.room_id &&
                  b.status !== filters.status_neq &&
                  matchOverlap(b.check_in as string, b.check_out as string, filters.gt as string, filters.lt as string),
                );
                resolve({ data, error: null });
              },
            };
            return sb;
          }),
          insert: vi.fn((row: Row) => ({
            select: vi.fn((_cols?: string) => ({
              single: vi.fn(() => {
                state.bookingIdCounter++;
                const id = `bk-${state.bookingIdCounter}`;
                const code = `PMH-TEST${state.bookingIdCounter}`;
                const inserted = { ...row, id, booking_code: code };
                state.bookings.push(inserted);
                return Promise.resolve({ data: { id, booking_code: code }, error: null });
              }),
            })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        };
        return builder;
      }

      if (table === "booking_rooms") {
        const builder: Row = {
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: state.booking_rooms, error: null })),
          })),
          insert: vi.fn((rows: Row[]) => {
            state.booking_rooms.push(...rows);
            return Promise.resolve({ data: rows, error: null });
          }),
        };
        return builder;
      }

      if (table === "room_unavailable_dates") {
        const builder: Row = {
          select: vi.fn(() => builder),
          eq: vi.fn(() => builder),
          gte: vi.fn(() => builder),
          lt: vi.fn(() => Promise.resolve({ data: state.room_unavailable_dates, error: null })),
        };
        return builder;
      }

      throw new Error(`Unhandled table in fake supabase: ${table}`);
    }),
    functions: {
      invoke: vi.fn((name: string, opts: { body?: Row }) => {
        state.notifyInvocations.push({ name, body: opts?.body ?? {} });
        return Promise.resolve({ data: null, error: null });
      }),
    },
  };
}

function makeState(): FakeState {
  return {
    rooms: [
      {
        id: "room-family",
        name: "Family Suite",
        price_per_night: 400000,
        room_numbers: ["301", "302"],
        max_guests: 4,
        sunday_price: null, monday_price: null, tuesday_price: null, wednesday_price: null,
        thursday_price: null, friday_price: null, saturday_price: null,
        promo_price: null, promo_start_date: null, promo_end_date: null,
        available: true,
      },
      {
        id: "room-deluxe",
        name: "Deluxe",
        price_per_night: 250000,
        room_numbers: ["201", "202", "203"],
        max_guests: 2,
        sunday_price: null, monday_price: null, tuesday_price: null, wednesday_price: null,
        thursday_price: null, friday_price: null, saturday_price: null,
        promo_price: null, promo_start_date: null, promo_end_date: null,
        available: true,
      },
    ],
    bookings: [],
    booking_rooms: [],
    room_unavailable_dates: [],
    room_promotions: [],
    bookingIdCounter: 0,
    notifyInvocations: [],
  };
}

describe("createAdminBooking — multi-room (1 booking, banyak kamar)", () => {
  let state: FakeState;
  // deno-lint-ignore no-explicit-any
  let supabase: any;

  beforeEach(() => {
    state = makeState();
    supabase = createFakeSupabase(state);
  });

  it("membuat 1 booking dengan 2 booking_rooms saat admin minta 2 kamar tipe berbeda untuk tanggal sama", async () => {
    const args = {
      guest_name: "Shilla Winata",
      guest_phone: "628123456789",
      check_in: "2026-05-01",
      check_out: "2026-05-02",
      num_guests: 5,
      room_selections: [
        { room_name: "Family Suite", quantity: 1 },
        { room_name: "Deluxe", quantity: 1 },
      ],
    };

    const result = await createAdminBooking(supabase, args) as Record<string, unknown>;

    // 1 baris bookings
    expect(state.bookings).toHaveLength(1);
    const booking = state.bookings[0];
    expect(booking.status).toBe("confirmed");
    expect(booking.guest_name).toBe("Shilla Winata");
    expect(booking.total_nights).toBe(1);
    expect(booking.total_price).toBe(400000 + 250000); // 650.000

    // 2 baris booking_rooms terisi benar
    expect(state.booking_rooms).toHaveLength(2);
    const familyRow = state.booking_rooms.find((r) => r.room_id === "room-family");
    const deluxeRow = state.booking_rooms.find((r) => r.room_id === "room-deluxe");
    expect(familyRow).toBeDefined();
    expect(deluxeRow).toBeDefined();
    expect(familyRow!.booking_id).toBe(booking.id);
    expect(deluxeRow!.booking_id).toBe(booking.id);
    expect(familyRow!.price_per_night).toBe(400000);
    expect(deluxeRow!.price_per_night).toBe(250000);
    // Nomor kamar otomatis dialokasikan dari kandidat tersedia (slot pertama)
    expect(familyRow!.room_number).toBe("301");
    expect(deluxeRow!.room_number).toBe("201");

    // Return value menandai multi-room
    expect(result.success).toBe(true);
    expect(result.multi_room).toBe(true);
    expect(result.total_rooms).toBe(2);
    expect(result.total_price).toBe(650000);
    expect(result.booking_code).toBe(booking.booking_code);
    expect(Array.isArray(result.rooms)).toBe(true);
    expect(result.rooms as unknown[]).toHaveLength(2);

    // Notifikasi manager dipanggil sekali dengan ringkasan multi-room
    expect(state.notifyInvocations).toHaveLength(1);
    expect(state.notifyInvocations[0].name).toBe("notify-new-booking");
  });

  it("mengalokasikan 2 kamar berbeda saat quantity=2 untuk tipe yang sama", async () => {
    const args = {
      guest_name: "Rombongan Test",
      guest_phone: "628111222333",
      check_in: "2026-06-10",
      check_out: "2026-06-11",
      num_guests: 4,
      room_selections: [
        { room_name: "Deluxe", quantity: 2 },
      ],
    };

    const result = await createAdminBooking(supabase, args) as Record<string, unknown>;

    expect(state.bookings).toHaveLength(1);
    expect(state.booking_rooms).toHaveLength(2);
    const numbers = state.booking_rooms.map((r) => r.room_number).sort();
    expect(numbers).toEqual(["201", "202"]);
    // Pastikan tidak duplikat
    expect(new Set(numbers).size).toBe(2);
    expect(result.total_price).toBe(250000 * 2);
    expect(result.multi_room).toBe(true);
  });

  it("menolak jika kamar tipe yang diminta sudah terboking penuh untuk tanggal tsb", async () => {
    // Pre-load: kedua nomor Family Suite sudah terboking di tanggal yang sama
    state.bookings.push(
      {
        id: "existing-1", room_id: "room-family", allocated_room_number: "301",
        check_in: "2026-05-01", check_out: "2026-05-02", status: "confirmed",
      },
      {
        id: "existing-2", room_id: "room-family", allocated_room_number: "302",
        check_in: "2026-05-01", check_out: "2026-05-02", status: "confirmed",
      },
    );

    const args = {
      guest_name: "Konflik Test",
      guest_phone: "628999000111",
      check_in: "2026-05-01",
      check_out: "2026-05-02",
      num_guests: 4,
      room_selections: [
        { room_name: "Family Suite", quantity: 1 },
        { room_name: "Deluxe", quantity: 1 },
      ],
    };

    await expect(createAdminBooking(supabase, args)).rejects.toThrow(/Family Suite/);
    // Tidak ada booking baru yang ter-create
    expect(state.bookings.filter((b) => b.guest_name === "Konflik Test")).toHaveLength(0);
    expect(state.booking_rooms).toHaveLength(0);
  });
});
