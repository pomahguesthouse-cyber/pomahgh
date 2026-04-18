
-- Create public bucket for invoice PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Anyone can read invoice files (needed so WhatsApp recipients can open the link)
CREATE POLICY "Public can view invoices"
ON storage.objects
FOR SELECT
USING (bucket_id = 'invoices');

-- Admins can upload invoices
CREATE POLICY "Admins can upload invoices"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'invoices'
  AND public.is_admin()
);

-- Admins can update invoices
CREATE POLICY "Admins can update invoices"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'invoices'
  AND public.is_admin()
);

-- Admins can delete invoices
CREATE POLICY "Admins can delete invoices"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'invoices'
  AND public.is_admin()
);
