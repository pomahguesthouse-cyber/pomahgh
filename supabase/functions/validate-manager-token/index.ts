import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TokenValidationRequest {
  token: string;
  startDate?: string;
  endDate?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token, startDate, endDate }: TokenValidationRequest = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate token
    const { data: tokenData, error: tokenError } = await supabase
      .from("manager_access_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if token is active
    if (!tokenData.is_active) {
      return new Response(
        JSON.stringify({ error: "Token has been disabled" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiration
    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Token has expired" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update last accessed timestamp
    await supabase
      .from("manager_access_tokens")
      .update({ last_accessed_at: new Date().toISOString() })
      .eq("id", tokenData.id);

    // Calculate date range (default: today to 30 days from now)
    const now = new Date();
    const defaultStart = startDate || now.toISOString().split("T")[0];
    const defaultEnd = endDate || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Fetch rooms
    const { data: rooms, error: roomsError } = await supabase
      .from("rooms")
      .select("*")
      .eq("available", true)
      .order("name");

    if (roomsError) {
      console.error("Error fetching rooms:", roomsError);
      throw roomsError;
    }

    // Fetch bookings within date range
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select(`
        *,
        room:rooms(id, name, room_numbers),
        booking_rooms(id, room_id, room_number, price_per_night)
      `)
      .gte("check_out", defaultStart)
      .lte("check_in", defaultEnd)
      .not("status", "in", '("cancelled","rejected")');

    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError);
      throw bookingsError;
    }

    // Fetch unavailable dates
    const { data: unavailableDates, error: unavailableError } = await supabase
      .from("room_unavailable_dates")
      .select("*")
      .gte("unavailable_date", defaultStart)
      .lte("unavailable_date", defaultEnd);

    if (unavailableError) {
      console.error("Error fetching unavailable dates:", unavailableError);
      throw unavailableError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        tokenName: tokenData.name,
        data: {
          rooms: rooms || [],
          bookings: bookings || [],
          unavailableDates: unavailableDates || [],
          dateRange: { start: defaultStart, end: defaultEnd },
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in validate-manager-token:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
