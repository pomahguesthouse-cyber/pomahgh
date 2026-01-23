-- Create table for admin chatbot command templates
CREATE TABLE public.admin_chatbot_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  command_key VARCHAR(50) NOT NULL UNIQUE,
  command_name VARCHAR(100) NOT NULL,
  command_description TEXT,
  template_content TEXT NOT NULL,
  available_variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_chatbot_templates ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Allow authenticated read" ON public.admin_chatbot_templates
  FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to update
CREATE POLICY "Allow authenticated update" ON public.admin_chatbot_templates
  FOR UPDATE TO authenticated USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Allow authenticated insert" ON public.admin_chatbot_templates
  FOR INSERT TO authenticated WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_admin_chatbot_templates_updated_at
  BEFORE UPDATE ON public.admin_chatbot_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default templates
INSERT INTO public.admin_chatbot_templates (command_key, command_name, command_description, template_content, available_variables, display_order) VALUES
(
  'guest_list',
  'Daftar Tamu',
  'Format respons untuk pertanyaan list tamu, daftar tamu, siapa tamu hari ini',
  'Berikut adalah daftar tamu untuk hari ini, {{tanggal}}:

*Check-in Hari Ini ({{jumlah_checkin}} Booking):*
{{list_checkin}}

*Check-out Hari Ini:*
{{list_checkout}}

*Tamu Menginap (Long Stay/In-House):*
{{list_inhouse}}

*Ringkasan Kondisi Hotel:*
• Total {{total_kamar}} unit kamar terisi hari ini.
• Total tamu menginap: {{total_tamu}} orang.

Apakah Bapak ingin saya mengirimkan reminder check-in melalui WhatsApp ke tamu yang akan datang hari ini?',
  '[{"key": "tanggal", "desc": "Tanggal hari ini (format: DD MMM YYYY)"}, {"key": "jumlah_checkin", "desc": "Jumlah booking check-in"}, {"key": "list_checkin", "desc": "Daftar tamu check-in"}, {"key": "list_checkout", "desc": "Daftar tamu check-out"}, {"key": "list_inhouse", "desc": "Daftar tamu menginap"}, {"key": "total_kamar", "desc": "Total unit kamar terisi"}, {"key": "total_tamu", "desc": "Total jumlah tamu"}]',
  1
),
(
  'checkin_reminder',
  'Reminder Check-in',
  'Template pesan WhatsApp reminder check-in untuk manager',
  '🌅 *DAFTAR TAMU CHECK-IN*
📅 {{tanggal}}

Total: {{jumlah_tamu}} tamu

{{list_tamu}}

_Pesan otomatis dari sistem_',
  '[{"key": "tanggal", "desc": "Tanggal check-in (format: DD MMM YYYY)"}, {"key": "jumlah_tamu", "desc": "Jumlah tamu check-in"}, {"key": "list_tamu", "desc": "Daftar lengkap tamu dengan detail"}]',
  2
),
(
  'booking_confirmation',
  'Konfirmasi Booking',
  'Template respons konfirmasi booking berhasil',
  '✅ *BOOKING BERHASIL*

Terima kasih, {{nama_tamu}}!

*Detail Booking:*
🎫 Kode: {{kode_booking}}
📅 Check-in: {{tanggal_checkin}}
📅 Check-out: {{tanggal_checkout}}
🛏️ Kamar: {{nama_kamar}}
👥 Jumlah Tamu: {{jumlah_tamu}} orang
💰 Total: {{total_harga}}

Silakan lakukan pembayaran untuk mengonfirmasi reservasi Anda.',
  '[{"key": "nama_tamu", "desc": "Nama tamu"}, {"key": "kode_booking", "desc": "Kode booking"}, {"key": "tanggal_checkin", "desc": "Tanggal check-in"}, {"key": "tanggal_checkout", "desc": "Tanggal check-out"}, {"key": "nama_kamar", "desc": "Nama tipe kamar"}, {"key": "jumlah_tamu", "desc": "Jumlah tamu"}, {"key": "total_harga", "desc": "Total harga booking"}]',
  3
),
(
  'checkout_reminder',
  'Reminder Check-out',
  'Template pesan WhatsApp reminder check-out untuk manager',
  '🌇 *DAFTAR TAMU CHECK-OUT*
📅 {{tanggal}}

Total: {{jumlah_tamu}} tamu

{{list_tamu}}

_Pesan otomatis dari sistem_',
  '[{"key": "tanggal", "desc": "Tanggal check-out"}, {"key": "jumlah_tamu", "desc": "Jumlah tamu check-out"}, {"key": "list_tamu", "desc": "Daftar tamu check-out"}]',
  4
),
(
  'daily_summary',
  'Ringkasan Harian',
  'Template ringkasan kondisi hotel harian',
  '📊 *RINGKASAN HOTEL*
📅 {{tanggal}}

*Statistik Hari Ini:*
• Check-in: {{jumlah_checkin}} booking
• Check-out: {{jumlah_checkout}} booking
• Total kamar terisi: {{total_kamar}} unit
• Total tamu: {{total_tamu}} orang
• Okupansi: {{okupansi}}%

{{catatan_tambahan}}',
  '[{"key": "tanggal", "desc": "Tanggal"}, {"key": "jumlah_checkin", "desc": "Jumlah check-in"}, {"key": "jumlah_checkout", "desc": "Jumlah check-out"}, {"key": "total_kamar", "desc": "Total kamar terisi"}, {"key": "total_tamu", "desc": "Total tamu"}, {"key": "okupansi", "desc": "Persentase okupansi"}, {"key": "catatan_tambahan", "desc": "Catatan tambahan"}]',
  5
);