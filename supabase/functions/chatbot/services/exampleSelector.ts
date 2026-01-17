import type { TrainingExample } from '../lib/types.ts';

/**
 * Detect category from user message content
 */
function detectCategory(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('book') || lower.includes('pesan') || lower.includes('reserv')) {
    return 'booking';
  }
  if (lower.includes('harga') || lower.includes('tarif') || lower.includes('biaya')) {
    return 'availability';
  }
  if (lower.includes('fasilitas') || lower.includes('ada apa') || lower.includes('tersedia')) {
    return 'facilities';
  }
  if (lower.includes('promo') || lower.includes('diskon') || lower.includes('potongan')) {
    return 'promo';
  }
  if (lower.includes('bayar') || lower.includes('transfer') || lower.includes('payment')) {
    return 'payment';
  }
  if (lower.includes('lokasi') || lower.includes('alamat') || lower.includes('dimana')) {
    return 'location';
  }
  if (lower.includes('keluhan') || lower.includes('komplain') || lower.includes('kecewa')) {
    return 'complaint';
  }
  if (lower.includes('ubah') || lower.includes('reschedule') || lower.includes('ganti')) {
    return 'reschedule';
  }
  if (lower.includes('batal') || lower.includes('cancel')) {
    return 'cancel';
  }
  if (lower.includes('halo') || lower.includes('hai') || lower.includes('selamat')) {
    return 'greeting';
  }
  if (lower.includes('extra') || lower.includes('tambahan') || lower.includes('add-on') || 
      lower.includes('addon') || lower.includes('sarapan') || lower.includes('breakfast')) {
    return 'addon';
  }

  return 'general';
}

/**
 * Select relevant training examples based on user message
 */
export function selectRelevantExamples(
  userMessage: string, 
  examples: TrainingExample[]
): TrainingExample[] {
  if (!examples || examples.length === 0) return [];

  const detectedCategory = detectCategory(userMessage);

  // Filter by detected category, then add some general examples
  const categoryExamples = examples.filter(ex => ex.category === detectedCategory);
  const generalExamples = examples.filter(ex => ex.category === 'general');

  // Return max 4 relevant examples
  return [...categoryExamples.slice(0, 3), ...generalExamples.slice(0, 1)].slice(0, 4);
}

/**
 * Format training examples for system prompt
 */
export function formatTrainingExamples(examples: TrainingExample[]): string {
  if (!examples || examples.length === 0) return '';
  
  return examples.map(ex => 
    `User: "${ex.question}"\nBot: "${ex.ideal_answer}"`
  ).join('\n\n');
}
