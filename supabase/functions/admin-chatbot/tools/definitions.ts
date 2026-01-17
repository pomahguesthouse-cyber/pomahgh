// ============= TOOL DEFINITIONS =============

import type { ToolDefinition } from "../lib/types.ts";

export const TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "get_availability_summary",
      description: "Cek ketersediaan semua kamar untuk rentang tanggal tertentu",
      parameters: {
        type: "object",
        properties: {
          check_in: { type: "string", description: "Tanggal check-in (YYYY-MM-DD)" },
          check_out: { type: "string", description: "Tanggal check-out (YYYY-MM-DD)" }
        },
        required: ["check_in", "check_out"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_booking_stats",
      description: "Dapatkan statistik booking untuk periode tertentu",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["today", "week", "month", "all"], description: "Periode statistik" }
        },
        required: ["period"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_recent_bookings",
      description: "Dapatkan daftar booking terbaru. Gunakan untuk 'tampilkan 5 booking terakhir', 'lihat 10 booking terbaru'",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Jumlah booking (default: 5, max: 20)" },
          status: { type: "string", enum: ["all", "confirmed", "pending", "cancelled"], description: "Filter status" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_bookings",
      description: "Cari booking berdasarkan nama tamu atau kode booking",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Nama tamu atau kode booking" },
          date_from: { type: "string", description: "Tanggal mulai (YYYY-MM-DD)" },
          date_to: { type: "string", description: "Tanggal akhir (YYYY-MM-DD)" },
          limit: { type: "number", description: "Jumlah hasil maksimal (default: 10)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_room_inventory",
      description: "Dapatkan daftar semua kamar dengan status dan jumlah unit",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "create_admin_booking",
      description: "Buat booking baru langsung (status confirmed). Nomor kamar opsional - otomatis dialokasikan jika tidak disebutkan.",
      parameters: {
        type: "object",
        properties: {
          guest_name: { type: "string", description: "Nama tamu" },
          guest_phone: { type: "string", description: "Nomor HP tamu" },
          guest_email: { type: "string", description: "Email tamu (opsional)" },
          room_name: { type: "string", description: "Nama tipe kamar (contoh: Deluxe, Superior, Villa)" },
          room_number: { type: "string", description: "Nomor kamar spesifik (opsional)" },
          check_in: { type: "string", description: "Tanggal check-in (YYYY-MM-DD)" },
          check_out: { type: "string", description: "Tanggal check-out (YYYY-MM-DD)" },
          num_guests: { type: "number", description: "Jumlah tamu" }
        },
        required: ["guest_name", "guest_phone", "room_name", "check_in", "check_out", "num_guests"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_checkin_reminder",
      description: "Kirim reminder daftar tamu check-in hari ini ke manager via WhatsApp",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Tanggal check-in (YYYY-MM-DD), default hari ini" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_room_price",
      description: "Update harga kamar (main/daily/promo)",
      parameters: {
        type: "object",
        properties: {
          room_name: { type: "string", description: "Nama kamar" },
          price_type: { 
            type: "string", 
            enum: ["main", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "weekday", "weekend", "promo"],
            description: "Jenis harga"
          },
          new_price: { type: "number", description: "Harga baru (Rupiah)" },
          promo_start_date: { type: "string", description: "Tanggal mulai promo" },
          promo_end_date: { type: "string", description: "Tanggal akhir promo" }
        },
        required: ["room_name", "price_type", "new_price"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_room_prices",
      description: "Lihat daftar harga kamar termasuk harga harian dan promo",
      parameters: {
        type: "object",
        properties: {
          room_name: { type: "string", description: "Nama kamar spesifik (opsional)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_today_guests",
      description: "Daftar tamu hari ini (check-in/checkout/menginap)",
      parameters: {
        type: "object",
        properties: {
          type: { 
            type: "string", 
            enum: ["checkin", "checkout", "staying", "all"],
            description: "Jenis data"
          },
          date: { type: "string", description: "Tanggal target (YYYY-MM-DD)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_booking_detail",
      description: "Lihat detail lengkap satu booking",
      parameters: {
        type: "object",
        properties: {
          booking_code: { type: "string", description: "Kode booking (BK-XXXX)" }
        },
        required: ["booking_code"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_booking_status",
      description: "Ubah status booking (confirm/cancel/pending)",
      parameters: {
        type: "object",
        properties: {
          booking_code: { type: "string", description: "Kode booking" },
          new_status: { 
            type: "string", 
            enum: ["confirmed", "pending", "cancelled"],
            description: "Status baru"
          },
          cancellation_reason: { type: "string", description: "Alasan pembatalan (opsional)" }
        },
        required: ["booking_code", "new_status"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_guest_info",
      description: "Edit info tamu (nama/HP/email)",
      parameters: {
        type: "object",
        properties: {
          booking_code: { type: "string", description: "Kode booking" },
          guest_name: { type: "string", description: "Nama baru (opsional)" },
          guest_phone: { type: "string", description: "HP baru (opsional)" },
          guest_email: { type: "string", description: "Email baru (opsional)" },
          num_guests: { type: "number", description: "Jumlah tamu baru (opsional)" }
        },
        required: ["booking_code"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "reschedule_booking",
      description: "Ubah tanggal check-in dan/atau check-out booking",
      parameters: {
        type: "object",
        properties: {
          booking_code: { type: "string", description: "Kode booking" },
          new_check_in: { type: "string", description: "Tanggal check-in baru" },
          new_check_out: { type: "string", description: "Tanggal check-out baru" }
        },
        required: ["booking_code"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "change_booking_room",
      description: "Pindahkan booking ke kamar lain",
      parameters: {
        type: "object",
        properties: {
          booking_code: { type: "string", description: "Kode booking" },
          new_room_name: { type: "string", description: "Nama tipe kamar baru" },
          new_room_number: { type: "string", description: "Nomor kamar spesifik" }
        },
        required: ["booking_code", "new_room_name", "new_room_number"]
      }
    }
  }
];
