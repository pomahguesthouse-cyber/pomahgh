/**
 * Tool definitions for AI function calling
 */
export const tools = [
  {
    type: "function",
    function: {
      name: "get_all_rooms",
      description: "Tampilkan semua tipe kamar dengan harga. Gunakan saat user tanya 'ada kamar apa?', 'tipe kamar?', 'harga kamar?'",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "check_availability",
      description: "Cek ketersediaan kamar untuk tanggal tertentu. Bisa untuk tahun ini atau tahun depan.",
      parameters: {
        type: "object",
        properties: {
          check_in: { type: "string", description: "Tanggal check-in format YYYY-MM-DD" },
          check_out: { type: "string", description: "Tanggal check-out format YYYY-MM-DD" },
          num_guests: { type: "number", description: "Jumlah tamu" }
        },
        required: ["check_in", "check_out"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_room_details",
      description: "Detail lengkap kamar tertentu",
      parameters: {
        type: "object",
        properties: {
          room_name: { type: "string", description: "Nama kamar (Deluxe, Villa, dll)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_facilities",
      description: "Daftar fasilitas hotel"
    }
  },
  {
    type: "function",
    function: {
      name: "create_booking_draft",
      description: "Buat booking. Nomor telepon WAJIB!",
      parameters: {
        type: "object",
        properties: {
          guest_name: { type: "string", description: "Nama lengkap" },
          guest_email: { type: "string", description: "Email" },
          guest_phone: { type: "string", description: "No HP (WAJIB!)" },
          check_in: { type: "string", description: "Check-in YYYY-MM-DD" },
          check_out: { type: "string", description: "Check-out YYYY-MM-DD" },
          num_guests: { type: "number", description: "Jumlah tamu" },
          room_name: { type: "string", description: "Nama kamar" },
          room_selections: { 
            type: "array", 
            description: "Multi-room: [{room_name, quantity}]",
            items: {
              type: "object",
              properties: {
                room_name: { type: "string" },
                quantity: { type: "number" }
              },
              required: ["room_name"]
            }
          }
        },
        required: ["guest_name", "guest_email", "guest_phone", "check_in", "check_out", "num_guests"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_booking_details",
      description: "Cari detail booking. WAJIB: kode, telepon, email untuk verifikasi",
      parameters: {
        type: "object",
        properties: {
          booking_id: { type: "string", description: "Kode PMH-XXXXXX" },
          guest_phone: { type: "string", description: "Telepon" },
          guest_email: { type: "string", description: "Email" }
        },
        required: ["booking_id", "guest_phone", "guest_email"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_booking",
      description: "Ubah booking. WAJIB verifikasi dulu",
      parameters: {
        type: "object",
        properties: {
          booking_id: { type: "string", description: "Kode PMH-XXXXXX" },
          guest_phone: { type: "string", description: "Telepon" },
          guest_email: { type: "string", description: "Email" },
          new_check_in: { type: "string", description: "Check-in baru" },
          new_check_out: { type: "string", description: "Check-out baru" },
          new_num_guests: { type: "number", description: "Tamu baru" },
          new_special_requests: { type: "string", description: "Request baru" }
        },
        required: ["booking_id", "guest_phone", "guest_email"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_payment_status",
      description: "Cek status pembayaran. WAJIB verifikasi",
      parameters: {
        type: "object",
        properties: {
          booking_id: { type: "string", description: "Kode PMH-XXXXXX" },
          guest_phone: { type: "string", description: "Telepon" },
          guest_email: { type: "string", description: "Email" }
        },
        required: ["booking_id", "guest_phone", "guest_email"]
      }
    }
  }
];
