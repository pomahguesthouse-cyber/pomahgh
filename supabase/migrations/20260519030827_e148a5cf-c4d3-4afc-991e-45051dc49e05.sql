CREATE TABLE IF NOT EXISTS public.fonnte_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  device_name TEXT,
  api_token TEXT NOT NULL,
  phone_number TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fonnte_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view fonnte devices"
  ON public.fonnte_devices FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert fonnte devices"
  ON public.fonnte_devices FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update fonnte devices"
  ON public.fonnte_devices FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete fonnte devices"
  ON public.fonnte_devices FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER fonnte_devices_updated_at
BEFORE UPDATE ON public.fonnte_devices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.ensure_single_default_fonnte_device()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE public.fonnte_devices
    SET is_default = false
    WHERE id <> NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER fonnte_devices_single_default
AFTER INSERT OR UPDATE OF is_default ON public.fonnte_devices
FOR EACH ROW
WHEN (NEW.is_default = true)
EXECUTE FUNCTION public.ensure_single_default_fonnte_device();

CREATE UNIQUE INDEX IF NOT EXISTS fonnte_devices_one_default_idx
ON public.fonnte_devices (is_default)
WHERE is_default = true;