-- Create landing_pages table for SEO-optimized pages
CREATE TABLE public.landing_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- SEO Fields
  page_title TEXT NOT NULL, -- Max 60 chars recommended
  slug TEXT NOT NULL UNIQUE,
  meta_description TEXT, -- Max 160 chars recommended
  primary_keyword TEXT NOT NULL,
  secondary_keywords TEXT[] DEFAULT '{}',
  
  -- Content Fields
  hero_headline TEXT NOT NULL, -- H1
  subheadline TEXT, -- H2
  page_content TEXT, -- Rich text/markdown content
  
  -- CTA Settings
  cta_text TEXT DEFAULT 'Booking via WhatsApp',
  whatsapp_number TEXT,
  whatsapp_message_template TEXT,
  
  -- Media
  hero_image_url TEXT,
  hero_image_alt TEXT,
  og_image_url TEXT,
  
  -- Status & Metadata
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  published_at TIMESTAMP WITH TIME ZONE,
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;

-- Public can read published pages
CREATE POLICY "Published pages are publicly viewable"
ON public.landing_pages
FOR SELECT
USING (status = 'published');

-- Admins can do everything (using profiles table pattern)
CREATE POLICY "Admins can manage all landing pages"
ON public.landing_pages
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
);

-- Create index for slug lookups
CREATE INDEX idx_landing_pages_slug ON public.landing_pages(slug);
CREATE INDEX idx_landing_pages_status ON public.landing_pages(status);

-- Create updated_at trigger
CREATE TRIGGER update_landing_pages_updated_at
BEFORE UPDATE ON public.landing_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();