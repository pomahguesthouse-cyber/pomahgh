// ============= ROLE-BASED ACCESS CONTROL =============

import type { ManagerRole } from "./constants.ts";

/**
 * Get explicit permission summary for a role (CAN/CANNOT format)
 * This helps the AI understand boundaries clearly
 */
export function getRolePermissionSummary(role: ManagerRole): string {
  switch (role) {
    case 'super_admin':
      return `- Full access to all features and data.
- CAN: View stats, create/edit/delete bookings, change prices, send notifications.`;
    
    case 'booking_manager':
      return `- CAN: View/create/edit bookings, check availability, view room inventory, send reminders.
- CANNOT: View revenue/financial stats, change room prices.`;
    
    case 'viewer':
      return `- CAN: View availability, room prices, and inventory only.
- CANNOT: Create, edit, or delete any data. Cannot send notifications.`;
    
    default:
      return '- Read-only access. Cannot modify any data.';
  }
}

/**
 * Get role restriction message to append to system prompt
 * This is the enforcement instruction
 */
export function getRoleRestrictionMessage(role: ManagerRole): string {
  if (role === 'super_admin') {
    return ''; // No restrictions for super admin
  }
  
  if (role === 'viewer') {
    return `

⚠️ ROLE RESTRICTION (VIEWER):
User has VIEW-ONLY access. You must:
1. REFUSE any request to create, update, or delete data
2. REFUSE requests to send notifications or reminders
3. Only provide information and explanations
4. Suggest contacting admin for data changes`;
  }
  
  if (role === 'booking_manager') {
    return `

⚠️ ROLE RESTRICTION (BOOKING MANAGER):
User cannot access:
1. Revenue or financial statistics (get_booking_stats with revenue)
2. Room price changes (update_room_price)
Politely refuse these requests and explain the limitation.`;
  }
  
  return '';
}

/**
 * Check if a specific tool is allowed for a role
 */
export function isToolAllowedForRole(toolName: string, role: ManagerRole): boolean {
  // Super admin can do everything
  if (role === 'super_admin') {
    return true;
  }
  
  // Viewer restrictions
  const viewerAllowedTools = [
    'get_availability_summary',
    'get_room_inventory',
    'get_room_prices',
    'get_today_guests'
  ];
  
  if (role === 'viewer') {
    return viewerAllowedTools.includes(toolName);
  }
  
  // Booking manager restrictions
  const bookingManagerForbiddenTools = [
    'update_room_price',
    // get_booking_stats is allowed but revenue field should be filtered
  ];
  
  if (role === 'booking_manager') {
    return !bookingManagerForbiddenTools.includes(toolName);
  }
  
  return false;
}
