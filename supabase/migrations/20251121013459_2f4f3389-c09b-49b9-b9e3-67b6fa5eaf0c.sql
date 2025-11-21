-- Create hotel_settings table
CREATE TABLE public.hotel_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Basic Information
  hotel_name text NOT NULL DEFAULT 'Pomah Guesthouse',
  tagline text DEFAULT 'Your Home Away From Home',
  description text DEFAULT 'Experience comfort and hospitality at Pomah Guesthouse',
  about_us text,
  
  -- Contact Information
  address text NOT NULL DEFAULT 'Jl. Example Street No. 123',
  city text DEFAULT 'Bali',
  state text DEFAULT 'Bali',
  postal_code text DEFAULT '80361',
  country text DEFAULT 'Indonesia',
  phone_primary text DEFAULT '+62 123 4567 890',
  phone_secondary text,
  email_primary text DEFAULT 'info@pomahguesthouse.com',
  email_reservations text DEFAULT 'reservations@pomahguesthouse.com',
  whatsapp_number text DEFAULT '+62 123 4567 890',
  
  -- Branding
  logo_url text,
  favicon_url text,
  primary_color text DEFAULT '#8B4513',
  secondary_color text DEFAULT '#D2691E',
  
  -- Social Media
  facebook_url text,
  instagram_url text,
  twitter_url text,
  tiktok_url text,
  youtube_url text,
  
  -- Business Hours
  check_in_time time DEFAULT '14:00:00',
  check_out_time time DEFAULT '12:00:00',
  reception_hours_start time DEFAULT '07:00:00',
  reception_hours_end time DEFAULT '22:00:00',
  
  -- Currency & Tax
  currency_code text DEFAULT 'IDR',
  currency_symbol text DEFAULT 'Rp',
  tax_rate numeric DEFAULT 0,
  tax_name text DEFAULT 'Tax'
);

-- Enable RLS
ALTER TABLE public.hotel_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view hotel settings"
  ON public.hotel_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can update hotel settings"
  ON public.hotel_settings
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can insert hotel settings"
  ON public.hotel_settings
  FOR INSERT
  WITH CHECK (is_admin());

-- Insert default settings (only if no settings exist)
INSERT INTO public.hotel_settings (hotel_name, tagline, description)
VALUES (
  'Pomah Guesthouse',
  'Your Home Away From Home',
  'Experience comfort and hospitality at Pomah Guesthouse'
)
ON CONFLICT DO NOTHING;

-- Create storage bucket for hotel assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('hotel-assets', 'hotel-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for hotel assets
CREATE POLICY "Anyone can view hotel assets"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'hotel-assets');

CREATE POLICY "Admins can upload hotel assets"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'hotel-assets' AND is_admin());

CREATE POLICY "Admins can update hotel assets"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'hotel-assets' AND is_admin())
  WITH CHECK (bucket_id = 'hotel-assets' AND is_admin());

CREATE POLICY "Admins can delete hotel assets"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'hotel-assets' AND is_admin());

-- Update trigger for hotel_settings
CREATE TRIGGER update_hotel_settings_updated_at
  BEFORE UPDATE ON public.hotel_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();