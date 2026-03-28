

## Rencana: PWA Admin App untuk Android

### Tujuan
Membuat aplikasi Android (PWA) khusus untuk admin/manager hotel, dengan 4 fitur utama: Kalender Booking, Daftar Booking, Guest Chatbot (WhatsApp sessions), dan Notifikasi pesan masuk. Aplikasi bisa diinstall dari browser ke home screen.

### Pendekatan
Membuat halaman baru `/app` sebagai entry point PWA mobile admin dengan bottom navigation, plus manifest.json untuk installability. Tidak menggunakan service worker (menghindari masalah cache di preview), cukup manifest standalone agar bisa "Add to Home Screen".

### Langkah Implementasi

**1. Buat manifest.json di public/**
- App name: "Pomah Admin"
- display: standalone, theme color sesuai branding
- Icons PWA (192x192, 512x512)
- start_url: /app

**2. Update index.html**
- Tambahkan link ke manifest.json
- Meta tags: theme-color, apple-mobile-web-app-capable, apple-mobile-web-app-status-bar-style

**3. Buat halaman `/app` (MobileAdminApp.tsx)**
- Layout mobile-first dengan bottom navigation (4 tab):
  - **Kalender** — reuse komponen BookingCalendar yang sudah ada, disesuaikan untuk mobile
  - **Booking** — daftar booking dengan filter & search (reuse hooks useAdminBookings)
  - **Chatbot** — WhatsApp sessions list + chat view (reuse WhatsAppSessionsTab/AdminChat)
  - **Notifikasi** — daftar pesan masuk terbaru dari WhatsApp
- Require authentication (admin login)
- Bottom nav dengan icons: Calendar, List, MessageCircle, Bell

**4. Komponen tab mobile**
- **MobileCalendarTab**: Kalender booking simplified untuk layar kecil, horizontal scroll
- **MobileBookingsTab**: List view booking dengan accordion, search, filter status
- **MobileChatTab**: Daftar sesi WhatsApp + bisa buka percakapan individual
- **MobileNotificationsTab**: Real-time list pesan WhatsApp masuk menggunakan hook useAdminNotifications yang sudah ada, ditambah daftar riwayat

**5. Push notification / real-time alerts**
- Gunakan Supabase realtime subscription yang sudah ada di useAdminNotifications
- Tambahkan visual badge counter di tab Notifikasi
- Sound notification tetap menggunakan Web Audio API yang sudah ada

**6. Route baru di App.tsx**
- `/app` — MobileAdminApp (protected, cek auth)
- `/app/login` — Mobile login page (simplified)

### Detail Teknis
- Tidak menggunakan `vite-plugin-pwa` atau service worker — hanya manifest.json untuk installability
- Reuse semua hooks existing (useAdminBookings, useWhatsAppSessions, useAdminNotifications, useAdminChatbot)
- Guard iframe/preview untuk manifest agar tidak mengganggu editor Lovable
- Responsive: optimized untuk viewport 360-430px width

### File yang akan dibuat/diedit
- `public/manifest.json` (baru)
- `index.html` (edit — tambah manifest link + meta)
- `src/pages/app/MobileAdminApp.tsx` (baru)
- `src/pages/app/tabs/MobileCalendarTab.tsx` (baru)
- `src/pages/app/tabs/MobileBookingsTab.tsx` (baru)
- `src/pages/app/tabs/MobileChatTab.tsx` (baru)
- `src/pages/app/tabs/MobileNotificationsTab.tsx` (baru)
- `src/pages/app/MobileLoginPage.tsx` (baru)
- `src/App.tsx` (edit — tambah route /app)

