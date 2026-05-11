-- Aktifkan realtime untuk whatsapp_sessions sehingga listener
-- postgres_changes di useMultiAgentDashboard dan useWhatsAppSessions
-- ikut fire saat is_takeover/takeover_by berubah.
--
-- Tanpa langkah ini, perubahan dari admin lain (atau dari webhook)
-- tidak terlihat di panel Live Chat tanpa refresh halaman.

ALTER TABLE public.whatsapp_sessions REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'whatsapp_sessions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_sessions';
  END IF;
END $$;
