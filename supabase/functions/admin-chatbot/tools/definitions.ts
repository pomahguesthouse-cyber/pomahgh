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
          num_guests: { type: "number", description: "Jumlah tamu" },
          payment_status: { type: "string", enum: ["unpaid", "paid", "down_payment", "pay_at_hotel"], description: "Status pembayaran. 'paid'=lunas/sudah bayar full, 'down_payment'=DP/baru bayar sebagian, 'unpaid'=belum bayar, 'pay_at_hotel'=bayar di hotel. Default: 'unpaid'" },
          payment_amount: { type: "number", description: "Nominal yang sudah dibayar (rupiah). WAJIB diisi jika payment_status='down_payment' (nominal DP) atau 'paid' (sama dengan total). Kosongkan jika 'unpaid'." },
          price_per_night: { type: "number", description: "Harga per malam yang disepakati manager (opsional, override harga default kamar)" }
        },
        required: ["guest_name", "guest_phone", "room_name", "check_in", "check_out", "num_guests"]
      }
    }
  },
    {
      type: "function",
      function: {
        name: "send_checkin_reminder",
        description: "Kirim reminder check-in WhatsApp ke semua tamu yang check-in pada tanggal tertentu",
        parameters: {
          type: "object",
          properties: {
            date: {
              type: "string",
              description: "Tanggal check-in dalam format YYYY-MM-DD"
            }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "send_calendar_link",
        description: "Kirim link calendar booking ke pengguna. Gunakan saat manager minta 'lihat jadwal', 'cek kalender', 'schedule booking', 'tampilkan calendar', 'view calendar', atau minta informasi visual tentang jadwal booking.",
        parameters: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Pesan tambahan untuk menyertai link (opsional)"
            }
          }
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
  },
  {
    type: "function",
    function: {
      name: "update_room_status",
      description: "Update status booking berdasarkan nomor kamar. Gunakan saat manager melaporkan tamu sudah check-in atau check-out. Contoh: '207 sudah checkout', '205 sudah checkin', 'tamu kamar 204 sudah datang'",
      parameters: {
        type: "object",
        properties: {
          room_number: { type: "string", description: "Nomor kamar yang dilaporkan (contoh: 207, 204, FS100)" },
          new_status: { type: "string", enum: ["checked_in", "checked_out"], description: "Status baru: checked_in atau checked_out" },
          date: { type: "string", description: "Tanggal operasi (YYYY-MM-DD), default hari ini" }
        },
        required: ["room_number", "new_status"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "extend_stay",
      description: "Perpanjang menginap tamu. Gunakan saat manager melaporkan tamu mau extend atau perpanjang. Contoh: '207 extend 1 malam', 'kamar 204 perpanjang sampai tanggal 25'",
      parameters: {
        type: "object",
        properties: {
          room_number: { type: "string", description: "Nomor kamar yang mau extend" },
          new_check_out: { type: "string", description: "Tanggal check-out baru (YYYY-MM-DD)" },
          extra_nights: { type: "number", description: "Jumlah malam tambahan" }
        },
        required: ["room_number"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "set_late_checkout",
      description: "Set late checkout untuk tamu yang checkout hari ini. Gunakan saat manager memilih opsi late checkout dengan waktu dan biaya. Contoh: '207 late checkout jam 17.00 biaya 100000', '204 LCO 15:00'",
      parameters: {
        type: "object",
        properties: {
          room_number: { type: "string", description: "Nomor kamar yang mau late checkout" },
          checkout_time: { type: "string", description: "Jam checkout baru (format HH:MM atau HH.MM atau hanya HH)" },
          fee: { type: "number", description: "Biaya late checkout (opsional, default 0)" }
        },
        required: ["room_number", "checkout_time"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_extend_availability",
      description: "Cek ketersediaan kamar untuk extend stay sebelum konfirmasi. Gunakan untuk validasi sebelum extend.",
      parameters: {
        type: "object",
        properties: {
          room_number: { type: "string", description: "Nomor kamar yang mau extend" },
          extra_nights: { type: "number", description: "Jumlah malam tambahan" }
        },
        required: ["room_number", "extra_nights"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_whatsapp_message",
      description: "Kirim pesan WhatsApp ke tamu atau pengelola lain. Gunakan saat manager minta: 'kirim pesan ke 08xxx', 'hubungi tamu xxx', 'WA ke xxx'. WAJIB ada nomor telepon dan isi pesan.",
      parameters: {
        type: "object",
        properties: {
          phone: { type: "string", description: "Nomor telepon tujuan (format 08xxx atau 62xxx)" },
          message: { type: "string", description: "Isi pesan yang akan dikirim" },
          booking_code: { type: "string", description: "Kode booking terkait (opsional, untuk konteks)" }
        },
        required: ["phone", "message"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_manager_list",
      description: "Dapatkan daftar semua pengelola/manager yang terdaftar beserta nomor teleponnya. Gunakan saat manager minta: 'kirim ke semua pengelola', 'broadcast ke pengelola', 'daftar pengelola'",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "send_brochure_to_guest",
      description: "Kirim FILE PDF brosur kamar Pomah Guesthouse ke nomor WhatsApp tamu. WAJIB digunakan saat manager minta: 'kirim brosur ke 08xxx', 'kirim brosur kamar ke +62xxx', 'kirimin brosur ke tamu xxx', 'WA brosur ke xxx'. JANGAN gunakan send_whatsapp_message untuk brosur — tool ini akan attach file PDF asli, bukan teks/link kosong.",
      parameters: {
        type: "object",
        properties: {
          phone: { type: "string", description: "Nomor telepon tujuan (format 08xxx atau 62xxx atau +62xxx)" },
          caption: { type: "string", description: "Caption pesan opsional (default: pesan ramah otomatis)" }
        },
        required: ["phone"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_room_price",
      description: "Update/ganti harga kamar. Gunakan saat manager minta: 'ganti harga deluxe jadi 250rb', 'update harga weekend family suite', 'set harga promo single'. Jenis harga: main (utama), weekday (senin-jumat), weekend (sabtu-minggu), monday-sunday (per hari), promo.",
      parameters: {
        type: "object",
        properties: {
          room_name: { type: "string", description: "Nama tipe kamar (contoh: Deluxe, Single, Family Suite)" },
          price_type: { type: "string", enum: ["main", "weekday", "weekend", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "promo"], description: "Jenis harga yang diubah" },
          new_price: { type: "number", description: "Harga baru dalam Rupiah (angka saja)" },
          promo_start_date: { type: "string", description: "Tanggal mulai promo (YYYY-MM-DD, hanya untuk price_type=promo)" },
          promo_end_date: { type: "string", description: "Tanggal akhir promo (YYYY-MM-DD, hanya untuk price_type=promo)" }
        },
        required: ["room_name", "price_type", "new_price"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_room_prices",
      description: "Lihat daftar harga semua kamar atau kamar tertentu. Gunakan saat manager minta: 'lihat harga kamar', 'berapa harga deluxe', 'cek harga semua kamar'",
      parameters: {
        type: "object",
        properties: {
          room_name: { type: "string", description: "Nama kamar spesifik (opsional, kosongkan untuk semua kamar)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_invoice",
      description: "Generate invoice PDF untuk booking dan kirim ke tamu via WhatsApp dan/atau email, atau ke booking manager. Gunakan saat manager minta: 'kirim invoice', 'invoice ke tamu', 'invoice ke booking manager', 'kirim invoice ke keduanya'. Tool ini otomatis membuat PDF dan mengirimkannya.",
      parameters: {
        type: "object",
        properties: {
          booking_code: { type: "string", description: "Kode booking (contoh: PMH-ABC123)" },
          recipient: { type: "string", enum: ["guest", "booking_manager", "both"], description: "Tujuan: 'guest'=tamu langsung, 'booking_manager'=hanya manager pemesan, 'both'=keduanya" },
          send_whatsapp: { type: "boolean", description: "Kirim via WhatsApp (default: true)" },
          send_email: { type: "boolean", description: "Kirim via email tamu (default: false, hanya jika recipient=guest atau both)" },
          manager_phone: { type: "string", description: "Nomor WA booking manager (wajib jika recipient='booking_manager' atau 'both'). Gunakan nomor pengirim pesan saat ini jika tidak disebutkan." }
        },
        required: ["booking_code", "recipient"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_booking_detail",
      description: "Dapatkan detail lengkap satu booking berdasarkan kode booking. Gunakan saat manager minta: 'detail booking PMH-xxx', 'cek booking PMH-xxx', 'info booking PMH-xxx'",
      parameters: {
        type: "object",
        properties: {
          booking_code: { type: "string", description: "Kode booking (contoh: PMH-ABC123)" }
        },
        required: ["booking_code"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_booking_status",
      description: "Update status booking (confirm, cancel, noshow, dll). Gunakan saat manager minta: 'cancel booking PMH-xxx', 'konfirmasi booking PMH-xxx', 'tandai noshow PMH-xxx'",
      parameters: {
        type: "object",
        properties: {
          booking_code: { type: "string", description: "Kode booking (contoh: PMH-ABC123)" },
          new_status: { type: "string", enum: ["confirmed", "cancelled", "checked_in", "checked_out", "no_show"], description: "Status baru booking" },
          cancellation_reason: { type: "string", description: "Alasan pembatalan (opsional, hanya untuk status cancelled)" }
        },
        required: ["booking_code", "new_status"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_today_guests",
      description: "Dapatkan daftar tamu hari ini (check-in, check-out, atau in-house). Gunakan saat manager minta: 'siapa tamu hari ini', 'daftar checkin hari ini', 'tamu checkout hari ini', 'siapa yang menginap'",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["all", "checkin", "checkout", "inhouse"], description: "Jenis daftar: all=semua, checkin=yang check-in, checkout=yang checkout, inhouse=sedang menginap" },
          date: { type: "string", description: "Tanggal spesifik (YYYY-MM-DD), default hari ini" }
        }
      }
    }
  }
];
