// ============= TOOL EXECUTOR WITH ROLE VALIDATION =============

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isToolAllowed } from "../lib/toolFilter.ts";
import type { ManagerRole } from "../lib/constants.ts";
import { adminCache } from "../lib/cache.ts";

import { getAvailabilitySummary, getTodayGuests } from "./availability.ts";
import { getBookingStats, getRecentBookings, searchBookings, getBookingDetail } from "./bookingStats.ts";
import { createAdminBooking, updateBookingStatus, updateGuestInfo, rescheduleBooking, changeBookingRoom, updateRoomStatus, extendStay, setLateCheckout, checkExtendAvailability } from "./bookingMutations.ts";
import { getRoomInventory, updateRoomPrice, getRoomPrices } from "./roomManagement.ts";
import { sendCheckinReminder, sendCalendarLink, sendWhatsAppMessage, getManagerList, sendInvoice, sendBrochureToGuest } from "./notifications.ts";

// Tools that modify data — cache must be invalidated after execution
const MUTATION_TOOLS: Record<string, string[]> = {
  create_admin_booking: ['booking', 'availability'],
  update_booking_status: ['booking'],
  update_guest_info: ['booking'],
  reschedule_booking: ['booking', 'availability'],
  change_booking_room: ['booking', 'availability'],
  update_room_status: ['room', 'availability'],
  extend_stay: ['booking', 'availability'],
  set_late_checkout: ['booking'],
  update_room_price: ['room', 'price'],
};

/**
 * Execute a tool with role re-validation
 * This provides an extra security layer beyond initial filtering
 */
export async function executeToolWithValidation(
  supabase: SupabaseClient,
  toolName: string,
  toolArgs: Record<string, unknown>,
  managerRole: ManagerRole
): Promise<unknown> {
  // SECURITY: Re-validate role has access to this tool
  if (!isToolAllowed(toolName, managerRole)) {
    throw new Error(`Akses ditolak: Role "${managerRole}" tidak dapat menggunakan "${toolName}"`);
  }
  
  const result = await executeTool(supabase, toolName, toolArgs);

  // Invalidate relevant caches after mutation tools
  const patterns = MUTATION_TOOLS[toolName];
  if (patterns) {
    for (const pattern of patterns) {
      const count = adminCache.invalidate(pattern);
      if (count > 0) {
        console.log(`🗑️ Cache invalidated: ${count} entries matching "${pattern}" after ${toolName}`);
      }
    }
  }

  return result;
}

/**
 * Execute tool by name
 */
async function executeTool(supabase: SupabaseClient, toolName: string, args: Record<string, unknown>): Promise<unknown> {
  console.log(`Executing tool: ${toolName}`, args);
  
  switch (toolName) {
    case 'get_availability_summary':
      return await getAvailabilitySummary(supabase, args.check_in as string, args.check_out as string);
    
    case 'get_booking_stats':
      return await getBookingStats(supabase, args.period as string);
    
    case 'get_recent_bookings':
      return await getRecentBookings(supabase, args.limit as number, args.status as string | undefined);
    
    case 'search_bookings':
      return await searchBookings(supabase, args.query as string | undefined, args.date_from as string | undefined, args.date_to as string | undefined, args.limit as number);
    
    case 'get_room_inventory':
      return await getRoomInventory(supabase);
    
    case 'create_admin_booking': {
      const result = await createAdminBooking(supabase, args);
      
      // SECURITY: Verify booking actually exists in database
      if (result.success && result.booking_code) {
        const { data: verifyBooking, error: verifyError } = await supabase
          .from('bookings')
          .select('id, booking_code')
          .eq('booking_code', result.booking_code)
          .single();
        
        if (verifyError || !verifyBooking) {
          console.error(`❌ CRITICAL: Booking ${result.booking_code} NOT FOUND after insert!`, verifyError);
          throw new Error(`Booking gagal tersimpan di database. Silakan coba lagi.`);
        }
        console.log(`✅ Booking ${result.booking_code} verified in database`);
      }
      return result;
    }
    
    case 'update_room_price':
      return await updateRoomPrice(supabase, args);
    
    case 'get_room_prices':
      return await getRoomPrices(supabase, args.room_name as string | undefined);
    
    case 'get_booking_detail':
      return await getBookingDetail(supabase, args.booking_code as string);
    
    case 'update_booking_status':
      return await updateBookingStatus(supabase, args.booking_code as string, args.new_status as string, args.cancellation_reason as string | undefined);
    
    case 'update_guest_info':
      return await updateGuestInfo(supabase, args);
    
    case 'reschedule_booking':
      return await rescheduleBooking(supabase, args);
    
    case 'change_booking_room':
      return await changeBookingRoom(supabase, args);
    
    case 'update_room_status':
      return await updateRoomStatus(supabase, args);
    
    case 'extend_stay':
      return await extendStay(supabase, args);
    
    case 'set_late_checkout':
      return await setLateCheckout(supabase, args);
    
    case 'check_extend_availability':
      return await checkExtendAvailability(supabase, args);
    
    case 'send_checkin_reminder':
      return await sendCheckinReminder(supabase, args.date as string);
    
    case 'get_today_guests':
      return await getTodayGuests(supabase, args.type as string, args.date as string | undefined);
    
    case 'send_calendar_link':
      return await sendCalendarLink(supabase, args.message as string);
    
    case 'send_whatsapp_message':
      return await sendWhatsAppMessage(supabase, args as { phone: string; message: string; booking_code?: string });
    
    case 'get_manager_list':
      return await getManagerList(supabase);

    case 'send_brochure_to_guest':
      return await sendBrochureToGuest(supabase, args as { phone: string; caption?: string });
    
    case 'send_invoice':
      return await sendInvoice(supabase, args as { booking_code: string; recipient: 'guest' | 'booking_manager' | 'both'; send_whatsapp?: boolean; send_email?: boolean; manager_phone?: string });
    
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
