-- Add footer_text column to invoice_templates
ALTER TABLE public.invoice_templates 
ADD COLUMN IF NOT EXISTS footer_text TEXT DEFAULT 'Kami menantikan kedatangan Anda!';