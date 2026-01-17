import { GREETING_RESPONSES } from '../lib/constants.ts';

/**
 * Check if message is a simple greeting and return quick response
 * Bypasses AI model for efficiency
 */
export function getQuickGreeting(message: string, personaName: string): string | null {
  const lower = message.toLowerCase().trim();
  
  for (const [key, responses] of Object.entries(GREETING_RESPONSES)) {
    if (lower === key || lower === `selamat ${key}`) {
      const response = responses[Math.floor(Math.random() * responses.length)];
      return `${response}\n\nSaya ${personaName} dari Pomah Guesthouse. Ada yang bisa saya bantu? Mau cek ketersediaan kamar atau ada pertanyaan lain? 🏨`;
    }
  }
  
  return null;
}
