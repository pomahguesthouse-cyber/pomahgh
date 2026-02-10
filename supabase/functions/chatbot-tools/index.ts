/**
 * Chatbot Tools Edge Function
 * 
 * Clean architecture with modular structure:
 * - lib/        → Constants, types, utilities
 * - services/   → Business logic (availability, WhatsApp)
 * - tools/      → Individual tool handlers
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "./lib/constants.ts";

// Import tool handlers
import { handleGetAllRooms } from "./tools/getAllRooms.ts";
import { handleCheckAvailability } from "./tools/checkAvailability.ts";
import { handleGetRoomDetails } from "./tools/getRoomDetails.ts";
import { handleGetFacilities } from "./tools/getFacilities.ts";
import { handleCreateBookingDraft } from "./tools/createBookingDraft.ts";
import { handleGetBookingDetails } from "./tools/getBookingDetails.ts";
import { handleUpdateBooking } from "./tools/updateBooking.ts";
import { handleCheckPaymentStatus } from "./tools/checkPaymentStatus.ts";
import { handleGetPaymentMethods } from "./tools/getPaymentMethods.ts";
import { handleNotifyLongstayInquiry } from "./tools/notifyLongstayInquiry.ts";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tool_name, parameters } = await req.json();
    
    // Create Supabase client with service role for admin operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let result;

    // Route to appropriate tool handler
    switch (tool_name) {
      case "get_all_rooms":
        result = await handleGetAllRooms(supabase);
        break;

      case "check_availability":
        result = await handleCheckAvailability(supabase, parameters);
        break;

      case "get_room_details":
        result = await handleGetRoomDetails(supabase, parameters);
        break;

      case "get_facilities":
        result = await handleGetFacilities(supabase);
        break;

      case "create_booking_draft":
        result = await handleCreateBookingDraft(supabase, parameters);
        break;

      case "get_booking_details":
        result = await handleGetBookingDetails(supabase, parameters);
        break;

      case "update_booking":
        result = await handleUpdateBooking(supabase, parameters);
        break;

      case "check_payment_status":
        result = await handleCheckPaymentStatus(supabase, parameters);
        break;

      case "get_payment_methods":
        result = await handleGetPaymentMethods(supabase, parameters);
        break;

      case "notify_longstay_inquiry":
        result = await handleNotifyLongstayInquiry(supabase, parameters);
        break;

      default:
        throw new Error(`Unknown tool: ${tool_name}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Tool execution error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
