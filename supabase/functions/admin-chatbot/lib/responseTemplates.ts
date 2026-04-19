// ============= RESPONSE TEMPLATES =============
// Structured response templates for consistent AI output

export const RESPONSE_TEMPLATES = {
  // Guest list format
  GUEST_LIST: `📋 **DAFTAR TAMU** - {{tanggal}}

**Check-in Hari Ini ({{count_checkin}} booking):**
{{list_checkin}}

**Check-out Hari Ini ({{count_checkout}} booking):**
{{list_checkout}}

**Tamu Menginap / In-House ({{count_inhouse}} booking):**
{{list_inhouse}}

📊 **Ringkasan:**
• Kamar terisi: {{total_rooms}} unit
• Total tamu: {{total_guests}} orang`,

  // Availability summary format
  AVAILABILITY: `🏨 **KETERSEDIAAN KAMAR** 
📅 {{check_in}} → {{check_out}}

{{room_list}}

✅ Total tersedia: {{total_available}} unit`,

  // Booking confirmation format
  BOOKING_CREATED: `✅ **BOOKING BERHASIL DIBUAT**

📝 Kode: **{{booking_code}}**
👤 Tamu: {{guest_name}}
📱 HP: {{guest_phone}}
🛏️ Kamar: {{room_name}} - {{room_number}}
📅 Check-in: {{check_in}}
📅 Check-out: {{check_out}}
🌙 Durasi: {{nights}} malam
💰 Total: Rp {{total_price}}
{{promo_info}}`,

  // Room status update format
  STATUS_UPDATED: `✅ **STATUS DIPERBARUI**

📝 Kode: {{booking_code}}
👤 Tamu: {{guest_name}}
🛏️ Kamar: {{room_numbers}} ({{room_type}})
🔄 Status: {{old_status}} → **{{new_status}}**`,

  // Extend stay format
  STAY_EXTENDED: `✅ **MENGINAP DIPERPANJANG**

📝 Kode: {{booking_code}}
👤 Tamu: {{guest_name}}
🛏️ Kamar: {{room_numbers}}
📅 Checkout baru: {{new_check_out}}
🌙 Total malam: {{old_nights}} → {{new_nights}} (+{{extra_nights}})
💰 Tambahan: Rp {{extra_price}}
💰 Total baru: Rp {{new_total_price}}`,

  // Error format
  ERROR: `❌ **ERROR**

{{message}}

💡 Tips: {{suggestion}}`,

  // Stats format
  BOOKING_STATS: `📊 **STATISTIK BOOKING** - {{period}}

📈 Total booking: {{total_bookings}}
✅ Confirmed: {{confirmed}}
🔄 Checked-in: {{checked_in}}
❌ Cancelled: {{cancelled}}

💰 Total revenue: Rp {{total_revenue}}
📅 Occupancy rate: {{occupancy_rate}}%`,
};

// Format currency to Indonesian format
export function formatCurrency(amount: number): string {
  return amount.toLocaleString('id-ID');
}

// Format date global: "Rab, 15/01/2025"
export function formatDateID(dateStr: string): string {
  const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const date = new Date(dateStr);
  const dayName = days[date.getDay()];
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dayName}, ${dd}/${mm}/${date.getFullYear()}`;
}

// Replace template variables
export function applyTemplate(template: string, variables: Record<string, string | number>): string {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, String(value));
  }
  
  // Clean up any remaining placeholders
  result = result.replace(/\{\{[^}]+\}\}/g, '-');
  
  return result;
}
