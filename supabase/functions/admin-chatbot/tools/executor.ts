// ============= TOOL EXECUTOR WITH ROLE VALIDATION =============

import { isToolAllowed } from "../lib/toolFilter.ts";
import type { ManagerRole } from "../lib/constants.ts";

import { getAvailabilitySummary, getTodayGuests } from "./availability.ts";
import { getBookingStats, getRecentBookings, searchBookings, getBookingDetail } from "./bookingStats.ts";
import { createAdminBooking, updateBookingStatus, updateGuestInfo, rescheduleBooking, changeBookingRoom, updateRoomStatus, extendStay, setLateCheckout, checkExtendAvailability } from "./bookingMutations.ts";
import { getRoomInventory, updateRoomPrice, getRoomPrices } from "./roomManagement.ts";
import { sendCheckinReminder, sendCalendarLink, sendWhatsAppMessage, getManagerList } from "./notifications.ts";

/**
 * Execute a tool with role re-validation
 * This provides an extra security layer beyond initial filtering
 */
export async function executeToolWithValidation(
  supabase: any,
  toolName: string,
  toolArgs: Record<string, any>,
  managerRole: ManagerRole
): Promise<any> {
  // SECURITY: Re-validate role has access to this tool
  if (!isToolAllowed(toolName, managerRole)) {
    throw new Error(`Akses ditolak: Role "${managerRole}" tidak dapat menggunakan "${toolName}"`);
  }
  
  return await executeTool(supabase, toolName, toolArgs);
}

/**
 * Execute tool by name
 */
async function executeTool(supabase: any, toolName: string, args: any): Promise<any> {
  console.log(`Executing tool: ${toolName}`, args);
  
  switch (toolName) {
    case 'get_availability_summary':
      return await getAvailabilitySummary(supabase, args.check_in, args.check_out);
    
    case 'get_booking_stats':
      return await getBookingStats(supabase, args.period);
    
    case 'get_recent_bookings':
      return await getRecentBookings(supabase, args.limit, args.status);
    
    case 'search_bookings':
      return await searchBookings(supabase, args.query, args.date_from, args.date_to, args.limit);
    
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
      return await getRoomPrices(supabase, args.room_name);
    
    case 'get_booking_detail':
      return await getBookingDetail(supabase, args.booking_code);
    
    case 'update_booking_status':
      return await updateBookingStatus(supabase, args.booking_code, args.new_status, args.cancellation_reason);
    
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
      return await sendCheckinReminder(supabase, args.date);
    
    case 'get_today_guests':
      return await getTodayGuests(supabase, args.type, args.date);
    
    case 'send_calendar_link':
      return await sendCalendarLink(supabase, args.message);
    
    case 'send_whatsapp_message':
      return await sendWhatsAppMessage(supabase, args);
    
    case 'get_manager_list':
      return await getManagerList(supabase);
    
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
