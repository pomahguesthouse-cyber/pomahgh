-- Create city_attractions table for Explore Semarang page
CREATE TABLE public.city_attractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  long_description TEXT,
  category TEXT NOT NULL,
  image_url TEXT,
  gallery_images TEXT[] DEFAULT '{}',
  address TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  distance_km DECIMAL,
  travel_time_minutes INTEGER,
  tips TEXT,
  best_time_to_visit TEXT,
  price_range TEXT,
  icon_name TEXT DEFAULT 'MapPin',
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.city_attractions ENABLE ROW LEVEL SECURITY;

-- Anyone can view active attractions
CREATE POLICY "Anyone can view active attractions"
ON public.city_attractions FOR SELECT
USING (is_active = true OR is_admin());

-- Admins can manage attractions
CREATE POLICY "Admins can insert attractions"
ON public.city_attractions FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update attractions"
ON public.city_attractions FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete attractions"
ON public.city_attractions FOR DELETE
USING (is_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_city_attractions_updated_at
BEFORE UPDATE ON public.city_attractions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default attractions data
INSERT INTO public.city_attractions (name, slug, description, long_description, category, distance_km, travel_time_minutes, icon_name, is_featured, display_order) VALUES
-- Wisata
('Lawang Sewu', 'lawang-sewu', 'Bangunan bersejarah ikonik dengan arsitektur kolonial Belanda yang megah', 'Lawang Sewu, yang berarti "Seribu Pintu" dalam bahasa Jawa, adalah landmark ikonik Semarang yang dibangun pada tahun 1904 sebagai kantor pusat perusahaan kereta api Hindia Belanda. Bangunan ini terkenal dengan arsitektur kolonial yang megah, jendela-jendela tinggi yang elegan, dan sejarahnya yang kaya. Pengunjung dapat menjelajahi museum di dalamnya yang menampilkan sejarah perkeretaapian Indonesia dan berbagai artefak bersejarah.', 'wisata', 3.5, 15, 'Building2', true, 1),
('Sam Poo Kong', 'sam-poo-kong', 'Kelenteng bersejarah peninggalan Laksamana Cheng Ho', 'Sam Poo Kong adalah kompleks kelenteng tertua di Semarang yang didirikan untuk menghormati Laksamana Cheng Ho, penjelajah Tiongkok yang singgah di Semarang pada abad ke-15. Kompleks ini memiliki arsitektur Tiongkok yang menakjubkan dengan gerbang merah megah, pagoda, dan patung-patung berukir indah. Tempat ini tidak hanya menjadi tempat ibadah tetapi juga destinasi wisata budaya yang menarik.', 'wisata', 5.2, 20, 'Landmark', true, 2),
('Kota Lama Semarang', 'kota-lama', 'Little Netherlands dengan bangunan kolonial yang terawat', 'Kota Lama Semarang dijuluki "Little Netherlands" karena koleksi bangunan kolonial Belanda yang masih terawat dengan baik. Area seluas 31 hektar ini dipenuhi dengan bangunan-bangunan bersejarah dari abad ke-18 hingga awal abad ke-20. Pengunjung dapat menikmati arsitektur Eropa klasik, kafe-kafe instagramable, dan suasana romantis terutama saat malam hari ketika lampu-lampu menyala.', 'wisata', 4.0, 18, 'Building', true, 3),
('Museum Ronggowarsito', 'museum-ronggowarsito', 'Museum terbesar di Jawa Tengah dengan koleksi lengkap', 'Museum Ronggowarsito adalah museum negeri terbesar di Jawa Tengah yang menyimpan lebih dari 60.000 koleksi benda bersejarah. Museum ini dinamai dari pujangga besar Jawa, Ronggowarsito. Koleksinya meliputi artefak prasejarah, keris, wayang, batik, dan berbagai peninggalan budaya Jawa lainnya.', 'wisata', 6.0, 25, 'GraduationCap', false, 4),

-- Kuliner
('Lunpia Gang Lombok', 'lunpia-gang-lombok', 'Lumpia legendaris khas Semarang sejak 1942', 'Lunpia Gang Lombok adalah produsen lumpia paling terkenal di Semarang yang telah beroperasi sejak tahun 1942. Lumpia khas Semarang berbeda dari lumpia daerah lain karena isian rebung yang gurih dan kulit yang renyah. Setiap hari, ratusan lumpia diproduksi dan dijual habis. Tersedia varian goreng dan basah dengan berbagai ukuran.', 'kuliner', 4.5, 20, 'UtensilsCrossed', true, 5),
('Tahu Gimbal', 'tahu-gimbal', 'Kuliner khas Semarang dengan bumbu kacang spesial', 'Tahu Gimbal adalah makanan khas Semarang yang terdiri dari tahu goreng, gimbal (sejenis bakwan udang), lontong, dan telur, disiram dengan bumbu kacang kental yang gurih. Makanan ini biasanya disajikan di pinggir jalan atau warung-warung tradisional dan menjadi sarapan favorit warga Semarang.', 'kuliner', 3.0, 12, 'Soup', true, 6),
('Bandeng Presto Juwana', 'bandeng-presto', 'Bandeng duri lunak khas Semarang', 'Bandeng Presto adalah olahan ikan bandeng khas Semarang dimana tulang ikannya menjadi lunak berkat proses presto (tekanan tinggi). Bandeng Presto Juwana adalah salah satu produsen paling terkenal dengan cita rasa yang sudah terjaga sejak puluhan tahun. Cocok sebagai oleh-oleh khas Semarang.', 'kuliner', 5.0, 22, 'Fish', false, 7),
('Wingko Babat', 'wingko-babat', 'Kue tradisional dari kelapa dan ketan', 'Wingko Babat adalah kue tradisional Semarang yang terbuat dari kelapa parut dan tepung ketan. Kue ini memiliki tekstur kenyal dan rasa manis gurih yang khas. Wingko Babat biasanya dijual hangat dan menjadi oleh-oleh wajib dari Semarang Jean di area Pandanaran.', 'kuliner', 4.0, 18, 'Cookie', false, 8),

-- Alam
('Pantai Marina', 'pantai-marina', 'Pantai modern dengan fasilitas lengkap', 'Pantai Marina adalah destinasi wisata pantai modern di Semarang yang menawarkan pemandangan laut, area bermain anak, dan berbagai wahana air. Pantai ini dilengkapi dengan jogging track, area piknik, dan restoran seafood. Cocok untuk wisata keluarga di akhir pekan.', 'alam', 8.0, 30, 'Waves', true, 9),
('Brown Canyon', 'brown-canyon', 'Grand Canyon versi Semarang dengan tebing dramatis', 'Brown Canyon adalah bekas area penambangan yang kini menjadi destinasi wisata unik di Semarang. Tebing-tebing tanah berwarna coklat kemerahan menciptakan pemandangan yang mirip dengan Grand Canyon di Amerika. Spot ini sangat populer untuk fotografi dan menikmati sunset.', 'alam', 12.0, 35, 'Mountain', false, 10),
('Goa Kreo', 'goa-kreo', 'Goa alami dengan koloni kera dan waduk indah', 'Goa Kreo adalah goa alami yang terletak di tepi Waduk Jatibarang. Tempat ini dihuni oleh ratusan kera ekor panjang yang jinak. Pengunjung dapat menikmati pemandangan waduk yang indah, berjalan menyusuri jembatan gantung, dan berinteraksi dengan kera-kera lucu.', 'alam', 15.0, 40, 'TreePine', false, 11),

-- Belanja
('Pasar Johar', 'pasar-johar', 'Pasar tradisional terbesar di Jawa Tengah', 'Pasar Johar adalah pasar tradisional terbesar di Jawa Tengah yang menjual berbagai kebutuhan dari batik, pakaian, hingga makanan. Pasar ini telah beroperasi sejak era kolonial dan menjadi pusat ekonomi masyarakat Semarang. Pengunjung dapat menemukan oleh-oleh khas Semarang dengan harga terjangkau.', 'belanja', 4.2, 18, 'ShoppingBag', true, 12),
('DP Mall', 'dp-mall', 'Pusat perbelanjaan modern di jantung kota', 'DP Mall adalah pusat perbelanjaan modern yang terletak di kawasan Simpang Lima, jantung kota Semarang. Mall ini menawarkan berbagai tenant fashion, kuliner, dan hiburan. Lokasinya yang strategis membuatnya menjadi destinasi belanja favorit warga Semarang.', 'belanja', 3.8, 15, 'Store', false, 13);