import type { TrainingExample, FAQPattern, KnowledgeItem } from '../lib/types.ts';

/**
 * Detect category from user message content
 */
export function detectCategory(message: string): string {
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
  if (lower.includes('lokasi') || lower.includes('alamat') || lower.includes('dimana') ||
      lower.includes('jarak') || lower.includes('jauh') || lower.includes('dekat') ||
      lower.includes('akses') || lower.includes('arah') || lower.includes('rute') ||
      lower.includes('km') || lower.includes('kilometer') || lower.includes('bandara') ||
      lower.includes('stasiun') || lower.includes('terminal')) {
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

/**
 * Select relevant FAQ patterns based on user message category
 */
export function selectRelevantFAQPatterns(
  userMessage: string,
  patterns: FAQPattern[]
): FAQPattern[] {
  if (!patterns || patterns.length === 0) return [];

  const detectedCategory = detectCategory(userMessage);
  const categoryPatterns = patterns.filter(p => p.category === detectedCategory);
  const otherPatterns = patterns.filter(p => p.category !== detectedCategory);

  return [...categoryPatterns.slice(0, 3), ...otherPatterns.slice(0, 2)].slice(0, 5);
}

/**
 * Format FAQ patterns for system prompt
 */
export function formatFAQPatterns(patterns: FAQPattern[]): string {
  if (!patterns || patterns.length === 0) return '';

  return patterns.map(p =>
    `Q: "${p.canonical_question}" (${p.occurrence_count}x ditanya)\nA: "${p.best_response}"`
  ).join('\n\n');
}

/**
 * Select relevant knowledge base items based on user message and keyword matching
 */
export function selectRelevantKnowledge(
  userMessage: string,
  items: KnowledgeItem[]
): KnowledgeItem[] {
  if (!items || items.length === 0) return [];

  const detectedCategory = detectCategory(userMessage);
  const lower = userMessage.toLowerCase();

  // Score each KB item by relevance
  const scored = items.map(kb => {
    let score = 0;
    const kbCategory = (kb.category || 'general').toLowerCase();
    const kbTitle = (kb.title || '').toLowerCase();
    const kbContent = (kb.content || '').toLowerCase();

    // Category match
    if (kbCategory === detectedCategory) score += 10;

    // Title keyword match
    const words = lower.split(/\s+/).filter(w => w.length > 2);
    for (const word of words) {
      if (kbTitle.includes(word)) score += 5;
      if (kbContent.includes(word)) score += 2;
    }

    return { item: kb, score };
  });

  // Sort by score desc, take top items with score > 0, fallback to general
  scored.sort((a, b) => b.score - a.score);
  const relevant = scored.filter(s => s.score > 0).slice(0, 5).map(s => s.item);

  if (relevant.length > 0) return relevant;

  // Fallback: return first 3 general items
  return items.filter(kb => (kb.category || 'general').toLowerCase() === 'general').slice(0, 3);
}

/**
 * Format knowledge base items for system prompt
 */
export function formatKnowledge(items: KnowledgeItem[]): string {
  if (!items || items.length === 0) return '';

  return items.map(kb => {
    const cat = kb.category?.toUpperCase() || 'INFO';
    // Use summary if available, otherwise use content (up to 600 chars)
    const body = kb.summary || (kb.content.length > 600 ? kb.content.substring(0, 600) + '...' : kb.content);
    return `[${cat}] ${kb.title}:\n${body}`;
  }).join('\n\n');
}
