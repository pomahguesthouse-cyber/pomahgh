-- Create storage bucket for media files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media-library',
  'media-library',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'video/mp4', 'video/webm', 'video/quicktime']
);

-- Create media_library table for metadata
CREATE TABLE public.media_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video')),
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  width INTEGER,
  height INTEGER,
  alt_text TEXT,
  tags TEXT[],
  folder TEXT DEFAULT 'uncategorized',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;

-- Create policies for media_library (public read, authenticated write)
CREATE POLICY "Media files are publicly viewable"
ON public.media_library
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert media"
ON public.media_library
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update media"
ON public.media_library
FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete media"
ON public.media_library
FOR DELETE
USING (auth.role() = 'authenticated');

-- Storage policies for media-library bucket
CREATE POLICY "Media files are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'media-library');

CREATE POLICY "Authenticated users can upload media"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'media-library' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update media files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'media-library' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete media files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'media-library' AND auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE TRIGGER update_media_library_updated_at
BEFORE UPDATE ON public.media_library
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();