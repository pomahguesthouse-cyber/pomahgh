/**
 * Error Messages - Centralized error messages for the application
 * Used in toast notifications and form validation
 */

export const ERROR_MESSAGES = {
  // Network/Server Errors
  NETWORK_ERROR: "Terjadi kesalahan jaringan. Silakan coba lagi.",
  SERVER_ERROR: "Terjadi kesalahan server. Silakan coba lagi nanti.",
  TIMEOUT: "Permintaan timeout. Silakan coba lagi.",
  SERVICE_UNAVAILABLE: "Layanan sedang tidak tersedia. Silakan coba lagi nanti.",

  // Authentication Errors
  UNAUTHORIZED: "Anda tidak terautentikasi. Silakan login terlebih dahulu.",
  FORBIDDEN: "Anda tidak memiliki akses ke sumber daya ini.",
  INVALID_CREDENTIALS: "Email atau password salah.",
  SESSION_EXPIRED: "Sesi Anda telah berakhir. Silakan login kembali.",

  // Validation Errors
  REQUIRED_FIELD: "Kolom ini harus diisi.",
  INVALID_EMAIL: "Email tidak valid.",
  PASSWORD_TOO_SHORT: "Password minimal 6 karakter.",
  INVALID_PHONE: "Nomor telepon tidak valid.",
  INVALID_DATE: "Tanggal tidak valid.",

  // Booking Errors
  ROOM_NOT_AVAILABLE: "Kamar tidak tersedia untuk tanggal yang dipilih.",
  INVALID_CHECK_IN_DATE: "Tanggal check-in tidak valid.",
  INVALID_CHECK_OUT_DATE: "Tanggal check-out harus setelah check-in.",
  BOOKING_FAILED: "Pemesanan gagal. Silakan coba lagi.",
  PAYMENT_FAILED: "Pembayaran gagal. Silakan coba lagi.",

  // File Upload Errors
  FILE_TOO_LARGE: "File terlalu besar. Maksimal 5MB.",
  INVALID_FILE_TYPE: "Tipe file tidak valid.",
  FILE_UPLOAD_FAILED: "Upload file gagal. Silakan coba lagi.",

  // General Errors
  NOT_FOUND: "Data tidak ditemukan.",
  DUPLICATE_ENTRY: "Data sudah ada.",
  OPERATION_FAILED: "Operasi gagal. Silakan coba lagi.",
  UNKNOWN_ERROR: "Terjadi kesalahan yang tidak diketahui.",
} as const;

export const SUCCESS_MESSAGES = {
  SAVED_SUCCESSFULLY: "Data berhasil disimpan.",
  DELETED_SUCCESSFULLY: "Data berhasil dihapus.",
  UPDATED_SUCCESSFULLY: "Data berhasil diperbarui.",
  CREATED_SUCCESSFULLY: "Data berhasil dibuat.",
  UPLOADED_SUCCESSFULLY: "File berhasil diupload.",
  BOOKING_CONFIRMED: "Pemesanan Anda telah dikonfirmasi.",
  PAYMENT_SUCCESSFUL: "Pembayaran berhasil.",
} as const;
