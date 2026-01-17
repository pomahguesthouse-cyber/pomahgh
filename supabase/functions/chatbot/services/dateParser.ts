import { DAY_NAMES } from '../lib/constants.ts';
import { getWIBTime, formatDateISO, addDays, getNextDayOfWeek } from '../utils/time.ts';
import type { ParsedDate } from '../lib/types.ts';

/**
 * Parse relative Indonesian date expressions to concrete dates
 */
export function parseRelativeDate(expression: string): ParsedDate | null {
  const wibTime = getWIBTime();
  const lower = expression.toLowerCase();

  // Today patterns
  if (lower.match(/\b(malam ini|nanti malam|hari ini|sekarang|tonight|today)\b/)) {
    return { 
      check_in: formatDateISO(wibTime), 
      check_out: formatDateISO(addDays(wibTime, 1)), 
      description: 'malam ini' 
    };
  }

  // Tomorrow patterns
  if (lower.match(/\b(besok|bsk|besuk|tomorrow)\b/)) {
    const besok = addDays(wibTime, 1);
    return { 
      check_in: formatDateISO(besok), 
      check_out: formatDateISO(addDays(besok, 1)), 
      description: 'besok' 
    };
  }

  // Day after tomorrow
  if (lower.match(/\b(lusa|lsa)\b/)) {
    const lusa = addDays(wibTime, 2);
    return { 
      check_in: formatDateISO(lusa), 
      check_out: formatDateISO(addDays(lusa, 1)), 
      description: 'lusa' 
    };
  }

  // Next week
  if (lower.match(/\b(minggu depan|pekan depan|next week)\b/)) {
    const nextWeek = addDays(wibTime, 7);
    return { 
      check_in: formatDateISO(nextWeek), 
      check_out: formatDateISO(addDays(nextWeek, 1)), 
      description: 'minggu depan' 
    };
  }

  // This weekend (Saturday)
  if (lower.match(/\b(weekend ini|akhir pekan ini|weekend|akhir pekan)\b/) && !lower.includes('depan')) {
    const saturday = getNextDayOfWeek(wibTime, 6);
    return { 
      check_in: formatDateISO(saturday), 
      check_out: formatDateISO(addDays(saturday, 2)), 
      description: 'weekend ini' 
    };
  }

  // Next weekend
  if (lower.match(/\b(weekend depan|akhir pekan depan)\b/)) {
    const thisSaturday = getNextDayOfWeek(wibTime, 6);
    const nextSaturday = addDays(thisSaturday, 7);
    return { 
      check_in: formatDateISO(nextSaturday), 
      check_out: formatDateISO(addDays(nextSaturday, 2)), 
      description: 'weekend depan' 
    };
  }

  // X days from now: "3 hari lagi", "5 hari kedepan"
  const daysAheadMatch = lower.match(/(\d+)\s*(hari|hr)\s*(lagi|kedepan|ke depan)/);
  if (daysAheadMatch) {
    const days = parseInt(daysAheadMatch[1]);
    const targetDate = addDays(wibTime, days);
    return { 
      check_in: formatDateISO(targetDate), 
      check_out: formatDateISO(addDays(targetDate, 1)), 
      description: `${days} hari lagi` 
    };
  }

  // Specific day names: "hari jumat", "jumat ini", "sabtu depan"
  for (const [dayName, dayIndex] of Object.entries(DAY_NAMES)) {
    if (lower.includes(dayName)) {
      const targetDay = getNextDayOfWeek(wibTime, dayIndex);
      // If "depan" mentioned, add another week
      if (lower.includes('depan')) {
        targetDay.setDate(targetDay.getDate() + 7);
      }
      return { 
        check_in: formatDateISO(targetDay), 
        check_out: formatDateISO(addDays(targetDay, 1)), 
        description: `hari ${dayName}` 
      };
    }
  }

  return null;
}
