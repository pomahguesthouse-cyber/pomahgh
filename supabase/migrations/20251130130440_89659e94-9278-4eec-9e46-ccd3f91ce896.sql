-- Create invoice_templates table
CREATE TABLE IF NOT EXISTS public.invoice_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- WhatsApp Template  
  whatsapp_template TEXT DEFAULT '🏨 *INVOICE BOOKING - {{hotel_name}}*

Kode Booking: *{{booking_code}}*
Nama Tamu: {{guest_name}}

📅 *Detail Menginap*
Check-in: {{check_in_date}}, {{check_in_time}}
Check-out: {{check_out_date}}, {{check_out_time}}
Total Malam: {{total_nights}}

🛏️ *Detail Kamar*
{{room_list}}

💰 *Ringkasan Pembayaran*
Total: {{total_price}}
Terbayar: {{payment_amount}}
*Sisa: {{remaining_balance}}*
Status: {{payment_status}}

🏦 *Transfer ke:*
{{bank_accounts}}

⚠️ Pembayaran paling lambat sebelum check-in.

Terima kasih telah memilih {{hotel_name}}! 🙏',
  
  -- Invoice Visual
  invoice_primary_color TEXT DEFAULT '#8B4513',
  invoice_secondary_color TEXT DEFAULT '#f8f4f0',
  show_logo BOOLEAN DEFAULT true,
  show_bank_accounts BOOLEAN DEFAULT true,
  custom_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoice_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view invoice templates"
  ON public.invoice_templates
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can update invoice templates"
  ON public.invoice_templates
  FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can insert invoice templates"
  ON public.invoice_templates
  FOR INSERT
  WITH CHECK (is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_invoice_templates_updated_at
  BEFORE UPDATE ON public.invoice_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default template
INSERT INTO public.invoice_templates (id) VALUES (gen_random_uuid());