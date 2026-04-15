/** Format AI response for WhatsApp compatibility */
export function formatForWhatsApp(text: string): string {
  text = text.replace(/\|[^\n]+\|/g, '');
  text = text.replace(/\|-+\|/g, '');
  text = text.replace(/\*\*([^*]+)\*\*/g, '*$1*');
  text = text.replace(/^###?\s*(.+)$/gm, '*$1*');
  text = text.replace(/\n{3,}/g, '\n\n');

  if (text.length > 4000) {
    text = text.substring(0, 3997) + '...';
  }

  return text.trim();
}

/** Heuristic: is the message likely a person's name? */
export function isLikelyPersonName(rawMessage: string): boolean {
  const text = rawMessage.trim();
  if (!text) return false;
  if (text.length < 2 || text.length > 40) return false;
  if (/\d/.test(text)) return false;
  if (/[?@#%&_=+\/\\]/.test(text)) return false;
  if (/\b(harga|kamar|booking|check.?in|check.?out|berapa|promo|fasilitas|alamat|lokasi|wifi|bayar|transfer|cancel|batal|tolong|mohon|skip|nanti\s+aja|ga\s+usah|tidak\s+usah)\b/i.test(text)) {
    return false;
  }
  if (!/^[A-Za-z .'-]+$/.test(text)) return false;
  const words = text.split(/\s+/).filter(Boolean);
  return words.length >= 1 && words.length <= 4;
}

/** Convert Indonesian month to number */
export function indonesianMonthToNumber(month: string): number {
  const months: Record<string, number> = {
    'januari': 1, 'februari': 2, 'maret': 3, 'april': 4, 'mei': 5, 'juni': 6,
    'juli': 7, 'agustus': 8, 'september': 9, 'oktober': 10, 'november': 11, 'desember': 12
  };
  return months[month.toLowerCase()] || 1;
}

/** Convert Indonesian date to ISO format with smart year inference */
export function indonesianDateToISO(day: string, month: string, year: string): string {
  const monthNum = indonesianMonthToNumber(month);
  const dayNum = parseInt(day);
  let yearNum = parseInt(year);

  const targetDate = new Date(yearNum, monthNum - 1, dayNum);
  const now = new Date();
  const wibOffset = 7 * 60;
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const wibTime = new Date(utc + (wibOffset * 60000));
  const today = new Date(wibTime.getFullYear(), wibTime.getMonth(), wibTime.getDate());

  if (targetDate < today) {
    yearNum += 1;
    console.warn(`⚠️ Date ${day} ${month} ${year} is in the past, correcting to ${yearNum}`);
  }

  return `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
}
