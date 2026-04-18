-- Extend invoice_templates with toggles + QRIS + automation
ALTER TABLE public.invoice_templates
  ADD COLUMN IF NOT EXISTS show_qris BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_breakdown BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS footer_text TEXT DEFAULT 'Terima kasih telah memilih kami. Syarat dan ketentuan berlaku.',
  ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT 'helvetica',
  ADD COLUMN IF NOT EXISTS auto_send_invoice BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_verify_ocr BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_review_mode BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ocr_confidence_threshold NUMERIC DEFAULT 0.95,
  ADD COLUMN IF NOT EXISTS payment_deadline_hours INTEGER DEFAULT 24,
  ADD COLUMN IF NOT EXISTS qris_image_url TEXT,
  ADD COLUMN IF NOT EXISTS notify_guest_on_approve BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_guest_on_reject BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS approve_message_template TEXT DEFAULT '✅ Halo *{{guest_name}}*, pembayaran untuk booking *{{booking_code}}* telah kami konfirmasi LUNAS. Terima kasih! 🙏

Kami tunggu kedatangan Anda di {{check_in_date}}.',
  ADD COLUMN IF NOT EXISTS reject_message_template TEXT DEFAULT '⚠️ Halo *{{guest_name}}*, mohon maaf bukti pembayaran untuk booking *{{booking_code}}* belum dapat kami konfirmasi.

Alasan: {{reason}}

Mohon kirim ulang bukti transfer yang valid atau hubungi kami. Terima kasih 🙏';

-- Ensure single row exists
INSERT INTO public.invoice_templates (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.invoice_templates);

-- Public-readable QRIS bucket (reuse hotel-assets is fine; create dedicated for clarity)
INSERT INTO storage.buckets (id, name, public)
VALUES ('qris-images', 'qris-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for qris-images
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'QRIS images publicly readable' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "QRIS images publicly readable"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'qris-images');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage QRIS images' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Admins manage QRIS images"
      ON storage.objects FOR ALL
      USING (bucket_id = 'qris-images' AND public.is_admin())
      WITH CHECK (bucket_id = 'qris-images' AND public.is_admin());
  END IF;
END$$;