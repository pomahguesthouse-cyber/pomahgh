-- Create rooms table for accommodation data
CREATE TABLE public.rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price_per_night DECIMAL(10,2) NOT NULL,
  max_guests INTEGER NOT NULL DEFAULT 2,
  features TEXT[] NOT NULL DEFAULT '{}',
  image_url TEXT NOT NULL,
  virtual_tour_url TEXT,
  available BOOLEAN NOT NULL DEFAULT true,
  size_sqm INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bookings table for reservations
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  total_nights INTEGER NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  num_guests INTEGER NOT NULL DEFAULT 1,
  special_requests TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT check_dates CHECK (check_out > check_in),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed'))
);

-- Enable Row Level Security
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rooms (public read access)
CREATE POLICY "Anyone can view available rooms" 
ON public.rooms 
FOR SELECT 
USING (available = true);

-- RLS Policies for bookings
CREATE POLICY "Anyone can create bookings" 
ON public.bookings 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view their own bookings" 
ON public.bookings 
FOR SELECT 
USING (guest_email = current_setting('request.jwt.claims', true)::json->>'email' OR true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_rooms_updated_at
BEFORE UPDATE ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample room data
INSERT INTO public.rooms (name, description, price_per_night, max_guests, features, image_url, size_sqm) VALUES
(
  'Deluxe Ocean View',
  'Spacious room with panoramic ocean views, king-size bed, and private balcony. Perfect for couples seeking romance and tranquility.',
  1500000,
  2,
  ARRAY['King Bed', 'Ocean View', 'Private Balcony', 'Air Conditioning', 'Mini Bar', 'Smart TV'],
  '/rooms/deluxe-ocean.jpg',
  50
),
(
  'Private Pool Villa',
  'Ultimate luxury with your own private pool, outdoor living area, and traditional Balinese architecture. The perfect escape for exclusive relaxation.',
  3500000,
  4,
  ARRAY['Private Pool', 'Outdoor Living', 'Garden View', 'King Bed', 'Kitchenette', 'Butler Service'],
  '/rooms/pool-villa.jpg',
  120
);

-- Create index for faster booking queries
CREATE INDEX idx_bookings_dates ON public.bookings(check_in, check_out);
CREATE INDEX idx_bookings_room_id ON public.bookings(room_id);