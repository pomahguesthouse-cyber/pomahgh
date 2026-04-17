/** Indonesian slang normalizer for better AI understanding */
const SLANG_MAP: Record<string, string> = {
  'dlx': 'deluxe', 'delux': 'deluxe', 'dluxe': 'deluxe',
  'grnd': 'grand', 'grd': 'grand',
  'fam': 'family', 'fmly': 'family',
  'sgl': 'single', 'sngl': 'single',
  'kmr': 'kamar', 'kmar': 'kamar',
  'brp': 'berapa', 'brapa': 'berapa',
  'bs': 'bisa', 'bsa': 'bisa', 'bza': 'bisa',
  'gk': 'tidak', 'ga': 'tidak', 'ngga': 'tidak', 'gak': 'tidak', 'nggak': 'tidak',
  'sy': 'saya', 'aku': 'saya', 'ak': 'saya', 'gw': 'saya', 'gue': 'saya',
  'mlm': 'malam', 'malem': 'malam',
  'org': 'orang', 'orng': 'orang',
  'tgl': 'tanggal', 'tggl': 'tanggal',
  'kpn': 'kapan', 'kapn': 'kapan',
  'bsk': 'besok', 'besuk': 'besok',
  'lsa': 'lusa',
  'gmn': 'bagaimana', 'gimana': 'bagaimana', 'gmna': 'bagaimana',
  'udh': 'sudah', 'udah': 'sudah', 'sdh': 'sudah',
  'blm': 'belum', 'blum': 'belum',
  'yg': 'yang', 'yng': 'yang',
  'dg': 'dengan', 'dgn': 'dengan',
  'utk': 'untuk', 'utuk': 'untuk', 'buat': 'untuk',
  'krn': 'karena', 'krna': 'karena',
  'lg': 'lagi', 'lgi': 'lagi',
  'msh': 'masih', 'msih': 'masih',
  'jg': 'juga', 'jga': 'juga',
  'tp': 'tapi', 'tpi': 'tapi',
  'sm': 'sama', 'ama': 'sama',
  'trims': 'terima kasih', 'tq': 'terima kasih', 'makasih': 'terima kasih', 'mksh': 'terima kasih',
};

// Single combined regex — compiled once per isolate
const SLANG_RE = new RegExp(`\\b(${Object.keys(SLANG_MAP).join('|')})\\b`, 'gi');

export function normalizeIndonesianMessage(msg: string): string {
  return msg.toLowerCase().replace(SLANG_RE, (match) => SLANG_MAP[match.toLowerCase()] || match);
}
