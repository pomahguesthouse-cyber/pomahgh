-- Aktifkan Supabase Realtime untuk tabel anak booking_rooms & booking_addons
-- agar perubahan dari chatbot (yang memanipulasi tabel-tabel ini) langsung
-- ter-broadcast ke admin booking calendar tanpa perlu refresh halaman.
--
-- REPLICA IDENTITY FULL diperlukan supaya payload realtime berisi snapshot
-- baris lama saat UPDATE/DELETE — UI butuh ini untuk merge cache yang akurat.

ALTER TABLE public.booking_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.booking_addons REPLICA IDENTITY FULL;

-- Tambahkan ke publication. Bungkus dengan DO block agar idempotent
-- (tidak gagal jika tabel sudah ada di publication).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'booking_rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_rooms;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'booking_addons'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_addons;
  END IF;
END $$;
