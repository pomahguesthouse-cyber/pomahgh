// ============= ROLE-BASED ACCESS CONTROL =============

import type { ManagerRole } from "./constants.ts";

/**
 * Get role restriction message for system prompt
 */
export function getRoleRestrictionMessage(role: ManagerRole): string {
  switch (role) {
    case 'viewer':
      return `\n\n🚫 PEMBATASAN AKSES (ROLE: VIEWER):
Anda hanya bisa melihat ketersediaan kamar dan daftar harga. Untuk fitur lain seperti membuat booking atau mengubah status, silakan hubungi Super Admin.`;
    
    case 'booking_manager':
      return `\n\n⚠️ PEMBATASAN AKSES (ROLE: BOOKING MANAGER):
Anda tidak dapat mengakses statistik pendapatan (get_booking_stats) atau mengubah harga kamar (update_room_price). Untuk fitur tersebut, silakan hubungi Super Admin.`;
    
    default:
      return '';
  }
}
