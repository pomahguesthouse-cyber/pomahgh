/** Indonesian slang normalizer for better AI understanding */
const SLANG_PATTERNS: Array<[RegExp, string]> = Object.entries({
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
}).map(([slang, replacement]) => [new RegExp(`\\b${slang}\\b`, 'gi'), replacement]);

export function normalizeIndonesianMessage(msg: string): string {
  let normalized = msg.toLowerCase();
  for (const [re, replacement] of SLANG_PATTERNS) {
    normalized = normalized.replace(re, replacement);
  }
  return normalized;
}
