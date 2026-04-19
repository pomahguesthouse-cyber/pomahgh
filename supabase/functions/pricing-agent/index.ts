// Pricing Agent — PURE DATA AGENT
// Role: cek harga + cek availability. Tidak pernah ngobrol ke user.
// Output: hybrid → { data: {...}, summary: "1 baris ringkas" }
// Sumber kebenaran harga untuk Booking Agent.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

const INTERNAL_SECRET = Deno.env.get("CHATBOT_TOOLS_INTERNAL_SECRET") || "";

interface AddonRequest {
  addon_name?: string;
  addon_id?: string;
  quantity: number;
  room_name?: string;
}

interface RoomSelection {
  room_name: string;
  quantity: number;
}

interface PricingRequest {
  check_in: string;          // YYYY-MM-DD
  check_out: string;         // YYYY-MM-DD
  num_guests?: number;
  room_selections?: RoomSelection[]; // optional — narrow to specific rooms
  add_ons?: AddonRequest[];
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn + "T00:00:00Z").getTime();
  const b = new Date(checkOut + "T00:00:00Z").getTime();
  return Math.max(1, Math.round((b - a) / 86400000));
}

function formatRupiah(n: number): string {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Internal-only auth
  const provided = req.headers.get("x-internal-secret") || "";
  if (!INTERNAL_SECRET || provided !== INTERNAL_SECRET) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as PricingRequest;
    const { check_in, check_out, num_guests, room_selections, add_ons } = body;
    if (!check_in || !check_out) {
      return new Response(JSON.stringify({ error: "check_in and check_out required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nights = nightsBetween(check_in, check_out);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Parallel data fetch
    const today = new Date().toISOString().split("T")[0];
    const [
      { data: rooms },
      { data: promotions },
      { data: addonsCatalog },
      { data: unavailableDates },
      { data: bookingRoomsData },
      { data: directBookings },
      { data: hotelSettings },
    ] = await Promise.all([
      supabase.from("rooms").select("id, name, allotment, room_numbers, price_per_night, max_guests, description").eq("available", true),
      supabase.from("room_promotions").select("*").eq("is_active", true).lte("start_date", today).gte("end_date", today).order("priority", { ascending: false }),
      supabase.from("room_addons").select("id, room_id, name, price, extra_capacity, max_quantity, is_active").eq("is_active", true),
      supabase.from("room_unavailable_dates").select("room_id, room_number, unavailable_date").gte("unavailable_date", check_in).lt("unavailable_date", check_out),
      supabase.from("booking_rooms").select("room_id, room_number, booking:bookings!inner(check_in, check_out, status)").not("booking.status", "in", '("cancelled","rejected")'),
      supabase.from("bookings").select("room_id, allocated_room_number, check_in, check_out").not("status", "in", '("cancelled","rejected")').lt("check_in", check_out).gt("check_out", check_in),
      supabase.from("hotel_settings").select("currency_symbol, currency_code").limit(1).maybeSingle(),
    ]);

    const currencySymbol = hotelSettings?.currency_symbol || "Rp";
    const currencyCode = hotelSettings?.currency_code || "IDR";

    // Promo lookup (highest priority per room)
    const promosByRoom = new Map<string, any>();
    (promotions || []).forEach((p: any) => {
      if (p.min_nights && nights < p.min_nights) return;
      if (!promosByRoom.has(p.room_id)) promosByRoom.set(p.room_id, p);
    });

    const resolvePromoPrice = (basePrice: number, promo: any): number => {
      if (!promo) return basePrice;
      if (promo.promo_price) return Number(promo.promo_price);
      if (promo.discount_percentage) return basePrice * (1 - Number(promo.discount_percentage) / 100);
      return basePrice;
    };

    // Long-stay discount (simple rule: 7+ nights = 10%, 14+ = 15%, 30+ = 20%)
    const longStayDiscount = nights >= 30 ? 0.20 : nights >= 14 ? 0.15 : nights >= 7 ? 0.10 : 0;

    const selectionMap = new Map<string, number>();
    (room_selections || []).forEach((s) => {
      selectionMap.set(s.room_name.toLowerCase(), s.quantity);
    });

    const roomsResult = (rooms || []).map((room: any) => {
      const numbers: string[] = (room.room_numbers as string[]) || [];
      const effective = numbers.length > 0 ? numbers : Array.from({ length: room.allotment || 0 }, (_, i) => `${room.name}-${i + 1}`);
      const totalUnits = effective.length;
      const blocked = new Set<string>();

      (unavailableDates || []).forEach((ud: any) => {
        if (ud.room_id !== room.id) return;
        if (!ud.room_number) effective.forEach(rn => blocked.add(rn));
        else blocked.add(ud.room_number);
      });
      (bookingRoomsData || []).forEach((br: any) => {
        if (br.room_id !== room.id || !br.room_number) return;
        const bs = Array.isArray(br.booking) ? br.booking : [br.booking];
        for (const b of bs) {
          if (b && b.check_in < check_out && b.check_out > check_in) { blocked.add(br.room_number); break; }
        }
      });
      (directBookings || []).forEach((b: any) => {
        if (b.room_id === room.id && b.allocated_room_number) blocked.add(b.allocated_room_number);
      });

      const availableCount = Math.max(0, totalUnits - blocked.size);
      const promo = promosByRoom.get(room.id) || null;
      const basePrice = Number(room.price_per_night);
      const promoPrice = resolvePromoPrice(basePrice, promo);
      const finalNightly = promoPrice * (1 - longStayDiscount);

      const extraBed = (addonsCatalog || []).find((a: any) =>
        (a.room_id === room.id || a.room_id === null) && /extra\s*bed/i.test(a.name || "")
      );
      const maxExtraBeds = extraBed?.max_quantity || 0;
      const extraCapPer = extraBed?.extra_capacity || 1;
      const maxGuestsWithExtraBed = room.max_guests + extraCapPer * maxExtraBeds;

      const requestedQty = selectionMap.get(room.name.toLowerCase()) || 0;
      const subtotalForOneRoom = finalNightly * nights;
      const subtotalForRequested = requestedQty > 0 ? subtotalForOneRoom * requestedQty : 0;

      return {
        room_id: room.id,
        name: room.name,
        available_count: availableCount,
        status: availableCount > 0 ? "tersedia" : "habis",
        max_guests: room.max_guests,
        max_extra_beds: maxExtraBeds,
        max_guests_with_extra_bed: maxGuestsWithExtraBed,
        suitable_for_guests: num_guests ? num_guests <= maxGuestsWithExtraBed : true,
        pricing: {
          base_price_per_night: basePrice,
          promo_price_per_night: promo ? promoPrice : null,
          long_stay_discount_pct: longStayDiscount * 100,
          final_price_per_night: Math.round(finalNightly),
          nights,
          subtotal_one_room: Math.round(subtotalForOneRoom),
          requested_quantity: requestedQty,
          subtotal_for_requested: Math.round(subtotalForRequested),
        },
        promo: promo ? {
          name: promo.name,
          badge: promo.badge_text,
          discount_percentage: promo.discount_percentage,
          promo_price: promo.promo_price,
        } : null,
      };
    });

    // Add-ons calculation
    const addonsResult = (add_ons || []).map((req) => {
      const match = (addonsCatalog || []).find((a: any) => {
        if (req.addon_id && a.id === req.addon_id) return true;
        if (req.addon_name && a.name?.toLowerCase().includes(req.addon_name.toLowerCase())) {
          if (req.room_name) {
            const room = (rooms || []).find((r: any) => r.name.toLowerCase() === req.room_name!.toLowerCase());
            return !a.room_id || a.room_id === room?.id;
          }
          return true;
        }
        return false;
      });
      const unitPrice = Number((match as any)?.price || 0);
      const total = unitPrice * req.quantity * nights;
      return {
        addon_name: (match as any)?.name || req.addon_name,
        room_name: req.room_name || null,
        unit_price: unitPrice,
        quantity: req.quantity,
        nights,
        total: Math.round(total),
        found: !!match,
      };
    });

    // Grand total (only if room_selections provided)
    const roomsTotal = roomsResult.reduce((s, r) => s + r.pricing.subtotal_for_requested, 0);
    const addonsTotal = addonsResult.reduce((s, a) => s + a.total, 0);
    const grandTotal = roomsTotal + addonsTotal;

    // Hybrid output: structured data + 1-line summary
    const availableRooms = roomsResult.filter(r => r.available_count > 0);
    const soldOut = roomsResult.filter(r => r.available_count === 0).map(r => r.name);

    let summary: string;
    if (room_selections && room_selections.length > 0 && grandTotal > 0) {
      summary = `Total ${nights} malam: ${formatRupiah(grandTotal)}${longStayDiscount > 0 ? ` (sudah diskon long-stay ${longStayDiscount * 100}%)` : ""}`;
    } else if (availableRooms.length > 0) {
      summary = `${availableRooms.length} tipe kamar tersedia ${check_in} → ${check_out} (${nights} malam)${soldOut.length ? `. Habis: ${soldOut.join(", ")}` : ""}`;
    } else {
      summary = `Semua kamar habis untuk ${check_in} → ${check_out}`;
    }

    return new Response(JSON.stringify({
      data: {
        check_in,
        check_out,
        nights,
        num_guests: num_guests || null,
        currency: { symbol: currencySymbol, code: currencyCode },
        long_stay_discount_pct: longStayDiscount * 100,
        rooms: roomsResult,
        add_ons: addonsResult,
        totals: {
          rooms_total: Math.round(roomsTotal),
          addons_total: Math.round(addonsTotal),
          grand_total: Math.round(grandTotal),
        },
        sold_out: soldOut,
      },
      summary,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("pricing-agent error:", err);
    return new Response(JSON.stringify({
      error: err instanceof Error ? err.message : "unknown",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
