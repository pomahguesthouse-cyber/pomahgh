-- Create invoice_templates table for customizable invoice layouts
CREATE TABLE IF NOT EXISTS public.invoice_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT false,
  
  -- Colors
  primary_color TEXT DEFAULT '#8B4513',
  secondary_color TEXT DEFAULT '#D2691E',
  text_color TEXT DEFAULT '#1a1a1a',
  background_color TEXT DEFAULT '#ffffff',
  accent_color TEXT DEFAULT '#f0f8ff',
  
  -- Logo & Header
  show_logo BOOLEAN DEFAULT true,
  logo_position TEXT DEFAULT 'left',
  logo_size TEXT DEFAULT 'medium',
  header_height INTEGER DEFAULT 80,
  
  -- Fonts
  font_family TEXT DEFAULT 'Arial',
  font_size_base INTEGER DEFAULT 12,
  font_size_heading INTEGER DEFAULT 24,
  
  -- Section Visibility
  show_guest_details BOOLEAN DEFAULT true,
  show_hotel_details BOOLEAN DEFAULT true,
  show_special_requests BOOLEAN DEFAULT true,
  show_payment_instructions BOOLEAN DEFAULT true,
  
  -- Custom Text
  custom_header_text TEXT,
  custom_footer_text TEXT,
  payment_title TEXT DEFAULT 'Instruksi Pembayaran',
  terms_and_conditions TEXT,
  
  -- Layout
  layout_style TEXT DEFAULT 'modern',
  border_style TEXT DEFAULT 'solid',
  spacing TEXT DEFAULT 'normal'
);

-- Enable RLS
ALTER TABLE public.invoice_templates ENABLE ROW LEVEL SECURITY;

-- Anyone can view active templates
CREATE POLICY "Anyone can view active invoice templates"
  ON public.invoice_templates
  FOR SELECT
  USING (is_active = true OR is_admin());

-- Only admins can manage templates
CREATE POLICY "Admins can insert invoice templates"
  ON public.invoice_templates
  FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update invoice templates"
  ON public.invoice_templates
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete invoice templates"
  ON public.invoice_templates
  FOR DELETE
  USING (is_admin());

-- Trigger to update updated_at
CREATE TRIGGER update_invoice_templates_updated_at
  BEFORE UPDATE ON public.invoice_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default template
INSERT INTO public.invoice_templates (is_active) VALUES (true);