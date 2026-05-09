-- ====================================================================
-- Optimasi Query Cleanup dengan EXPLAIN ANALYZE & Index pada expires_at
-- ====================================================================
-- Cara pakai: jalankan setiap blok EXPLAIN ANALYZE secara terpisah
-- di Supabase SQL Editor untuk melihat rencana eksekusi sebelum &
-- setelah index dibuat.
-- ====================================================================

-- ====================================================================
-- 1. DIAGNOSTIK: EXPLAIN ANALYZE untuk cleanup_stale_sessions()
-- Jalankan ini SEBELUM membuat index untuk melihat rencana eksekusi
-- ====================================================================
-- /*
--   -- Blokir pending_since (stuck batch > 1 jam)
--   EXPLAIN ANALYZE
--   UPDATE public.whatsapp_sessions
--   SET pending_messages = '{}', pending_since = null
--   WHERE pending_since IS NOT NULL
--     AND pending_since < now() - interval '1 hour';
--
--   -- Blokir is_active + last_message_at (sessions > 24 jam)
--   EXPLAIN ANALYZE
--   UPDATE public.whatsapp_sessions
--   SET is_active = false
--   WHERE is_active = true
--     AND last_message_at < now() - interval '24 hours';
--
--   -- Hapus sessions sangat lama (> 90 hari)
--   EXPLAIN ANALYZE
--   DELETE FROM public.whatsapp_sessions
--   WHERE is_active = false
--     AND last_message_at < now() - interval '90 days';
--
--   -- Hapus percakapan kosong (> 7 hari)
--   EXPLAIN ANALYZE
--   DELETE FROM public.chat_conversations
--   WHERE message_count = 0
--     AND started_at < now() - interval '7 days';
-- */
-- ====================================================================


-- ====================================================================
-- 2. INDEX BARU: whatsapp_sessions
-- ====================================================================
-- a) Composite index untuk query "nonaktifkan session > 24 jam" dan
--    "hapus session nonaktif > 90 hari". Kedua query filter
--    is_active + last_message_at.
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_cleanup_active
  ON public.whatsapp_sessions (is_active, last_message_at);

-- b) Index untuk query "bersihkan stuck batch > 1 jam".
--    Filter: pending_since IS NOT NULL AND pending_since < now()
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_pending_since
  ON public.whatsapp_sessions (pending_since)
  WHERE pending_since IS NOT NULL;


-- ====================================================================
-- 3. INDEX BARU: chat_conversations
-- ====================================================================
-- Index untuk query "hapus percakapan kosong > 7 hari"
CREATE INDEX IF NOT EXISTS idx_chat_conversations_cleanup
  ON public.chat_conversations (message_count, started_at)
  WHERE message_count = 0;


-- ====================================================================
-- 4. INDEX OPTIMAL: price_approvals (cleanupExpiredApprovals)
-- ====================================================================
-- Query: UPDATE ... SET status = 'expired'
--        WHERE status = 'pending' AND expires_at < now()
--
-- Index partial existing: (status) WHERE status = 'pending'
-- -> Kurang optimal karena tidak mencakup filter expires_at.
-- -> Drop & recreate dengan composite index.
-- ====================================================================
-- DIAGNOSTIK: jalankan sebelum & sesudah perubahan index
-- /*
--   EXPLAIN ANALYZE
--   UPDATE public.price_approvals
--   SET status = 'expired'
--   WHERE status = 'pending'
--     AND expires_at < now();
-- */
DROP INDEX IF EXISTS public.idx_price_approvals_pending;

CREATE INDEX IF NOT EXISTS idx_price_approvals_pending_expires
  ON public.price_approvals (status, expires_at)
  WHERE status = 'pending';


-- ====================================================================
-- 5. INDEX BARU: payment_transactions (expiry checker cron)
-- ====================================================================
-- Query di payment-expiry-checker & expire-pending-payments:
--   SELECT/UPDATE ... WHERE status = 'pending' AND expires_at < now()
--
-- Index existing: idx_payment_transactions_status (status) saja
-- -> Kurang optimal. Tambahkan partial index mencakup expires_at.
-- ====================================================================
-- DIAGNOSTIK: jalankan sebelum & sesudah
-- /*
--   EXPLAIN ANALYZE
--   UPDATE public.payment_transactions
--   SET status = 'expired', updated_at = now()
--   WHERE status = 'pending'
--     AND expires_at < now();
-- */
CREATE INDEX IF NOT EXISTS idx_payment_transactions_pending_expires
  ON public.payment_transactions (expires_at)
  WHERE status = 'pending';


-- ====================================================================
-- 6. INDEX BARU: price_cache (cache TTL)
-- ====================================================================
-- price_cache.expires_at digunakan untuk TTL cache tetapi tidak
-- pernah dibersihkan. Index ini memungkinkan cleanup eficien.
-- ====================================================================
-- DIAGNOSTIK:
-- /*
--   EXPLAIN ANALYZE
--   DELETE FROM public.price_cache
--   WHERE expires_at < now();
-- */
CREATE INDEX IF NOT EXISTS idx_price_cache_expires_at
  ON public.price_cache (expires_at);


-- ====================================================================
-- 7. FUNGSI CLEANUP: hapus price_cache yang sudah expired
-- ====================================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_price_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.price_cache
  WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


-- ====================================================================
-- 8. UPDATE: cleanup_stale_sessions()
--    - Tambahkan cleanup price_cache
--    - Batch DELETE untuk sessions > 90 hari (pakai LIMIT)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.cleanup_stale_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark sessions inactive if no activity for 24 hours
  UPDATE public.whatsapp_sessions
  SET is_active = false
  WHERE is_active = true
    AND last_message_at < now() - interval '24 hours';

  -- Clear pending message buffers older than 1 hour (stuck batches)
  UPDATE public.whatsapp_sessions
  SET pending_messages = '{}', pending_since = null
  WHERE pending_since IS NOT NULL
    AND pending_since < now() - interval '1 hour';

  -- Archive/delete very old inactive sessions (90 days)
  -- Batched: hapus maksimal 1000 per eksekusi agar tidak blokir太长
  DELETE FROM public.whatsapp_sessions
  WHERE ctid IN (
    SELECT ctid FROM public.whatsapp_sessions
    WHERE is_active = false
      AND last_message_at < now() - interval '90 days'
    LIMIT 1000
  );

  -- Clean up conversations with no messages older than 7 days
  DELETE FROM public.chat_conversations
  WHERE message_count = 0
    AND started_at < now() - interval '7 days';

  -- Clean up expired price cache entries
  DELETE FROM public.price_cache
  WHERE expires_at < now();
END;
$$;


-- ====================================================================
-- 9. JADWALKAN: cleanup price_cache setiap jam
-- ====================================================================
SELECT cron.schedule(
  'cleanup-expired-price-cache-hourly',
  '0 * * * *',
  $$SELECT public.cleanup_expired_price_cache()$$
);


-- ====================================================================
-- 10. VERIFIKASI: daftar index yang baru dibuat
-- ====================================================================
-- /*
--   SELECT schemaname, tablename, indexname, indexdef
--   FROM pg_indexes
--   WHERE indexname IN (
--     'idx_whatsapp_sessions_cleanup_active',
--     'idx_whatsapp_sessions_pending_since',
--     'idx_chat_conversations_cleanup',
--     'idx_price_approvals_pending_expires',
--     'idx_payment_transactions_pending_expires',
--     'idx_price_cache_expires_at'
--   )
--   ORDER BY tablename, indexname;
-- */


-- ====================================================================
-- 11. DIAGNOSTIK SETELAH INDEX: jalankan ulang EXPLAIN ANALYZE
--     dari langkah 1. Bandingkan:
--     - "Seq Scan" → "Index Scan" / "Index Only Scan"
--     - Waktu eksekusi (ms)
--     - estimated rows vs actual rows
-- ====================================================================
