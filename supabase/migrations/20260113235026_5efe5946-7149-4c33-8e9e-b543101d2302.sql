-- Create table for price change notifications
CREATE TABLE public.price_change_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competitor_room_id UUID REFERENCES public.competitor_rooms(id) ON DELETE CASCADE,
  previous_price NUMERIC NOT NULL,
  new_price NUMERIC NOT NULL,
  price_change_percent NUMERIC NOT NULL,
  our_room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.price_change_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all notifications
CREATE POLICY "Admins can view price change notifications"
ON public.price_change_notifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Policy: Admins can update (mark as read)
CREATE POLICY "Admins can update price change notifications"
ON public.price_change_notifications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Policy: Allow service role to insert (for edge function)
CREATE POLICY "Service role can insert notifications"
ON public.price_change_notifications
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_price_change_notifications_created_at 
ON public.price_change_notifications(created_at DESC);

CREATE INDEX idx_price_change_notifications_is_read 
ON public.price_change_notifications(is_read) WHERE NOT is_read;