export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const INDONESIAN_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const GREETING_RESPONSES: Record<string, string[]> = {
  'pagi': ['Selamat pagi! 🌅', 'Pagi! ☀️'],
  'siang': ['Selamat siang! ☀️', 'Siang! 🌞'],
  'sore': ['Selamat sore! 🌆', 'Sore! 🌇'],
  'malam': ['Selamat malam! 🌙', 'Malam! ✨'],
  'halo': ['Halo! 👋'],
  'hai': ['Hai! 👋'],
  'hi': ['Hi! 👋'],
  'hello': ['Hello! 👋'],
  'hallo': ['Hallo! 👋'],
  'p': ['Halo! 👋'],
  'tes': ['Halo! 👋 Ada yang bisa saya bantu?'],
  'test': ['Halo! 👋 Ada yang bisa saya bantu?'],
};

export const TRAIT_DESCRIPTIONS: Record<string, string> = {
  'ramah': 'hangat dan bersahabat',
  'profesional': 'kompeten dan terpercaya',
  'helpful': 'selalu siap membantu',
  'ceria': 'penuh semangat positif',
  'empati': 'memahami perasaan tamu',
  'lucu': 'bisa menghibur dengan humor ringan',
  'sabar': 'tidak terburu-buru',
  'informatif': 'memberikan info lengkap',
  'proaktif': 'menawarkan bantuan tanpa diminta',
  'sopan': 'berbahasa santun'
};

export const COMMUNICATION_STYLES: Record<string, string> = {
  'formal': 'gunakan bahasa baku dan resmi, sebut dengan Bapak/Ibu',
  'semi-formal': 'sopan tapi tidak kaku, gunakan Anda/Kak',
  'santai-profesional': 'friendly tapi tetap profesional, campuran formal-informal',
  'casual': 'seperti ngobrol dengan teman, gunakan kamu/aku'
};

export const EMOJI_USAGE: Record<string, string> = {
  'none': 'JANGAN gunakan emoji sama sekali',
  'minimal': 'gunakan 1-2 emoji saja per pesan (di akhir saja)',
  'moderate': 'gunakan 2-3 emoji secukupnya untuk ekspresi',
  'expressive': 'gunakan emoji ekspresif untuk menambah kesan ramah'
};

export const FORMALITY_PRONOUNS: Record<string, string> = {
  'formal': 'Saya, Bapak/Ibu, Anda',
  'semi-formal': 'Saya, Kak, Anda',
  'informal': 'Aku, Kamu'
};

export const PRICE_TYPE_LABELS: Record<string, string> = {
  'per_night': '/malam',
  'per_person_per_night': '/orang/malam',
  'per_person': '/orang',
  'once': ' (sekali bayar)'
};

export const DAY_NAMES: Record<string, number> = {
  'minggu': 0, 'senin': 1, 'selasa': 2, 'rabu': 3,
  'kamis': 4, 'jumat': 5, "jum'at": 5, 'sabtu': 6
};

export const LOVABLE_API_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
