// ============= KNOWLEDGE BASE & TRAINING CONTEXT =============

import type { KnowledgeItem, TrainingExample } from "./types.ts";

/**
 * Smart truncation - cut at sentence boundary, not arbitrary position
 * This prevents mid-context cutoffs that can confuse the AI
 */
export function truncateSafely(content: string, maxLength: number = 400): string {
  if (!content || content.length <= maxLength) return content || '';
  
  // Find last period before maxLength
  const lastPeriod = content.lastIndexOf('.', maxLength);
  if (lastPeriod > maxLength * 0.6) {
    return content.substring(0, lastPeriod + 1);
  }
  
  // Fallback: cut at last space with ellipsis
  const lastSpace = content.lastIndexOf(' ', maxLength - 3);
  if (lastSpace > maxLength * 0.5) {
    return content.substring(0, lastSpace) + '...';
  }
  
  // Last resort: hard cut with ellipsis
  return content.substring(0, maxLength - 3) + '...';
}

/**
 * Build knowledge base context with smart truncation
 */
export function buildKnowledgeContext(
  knowledge: KnowledgeItem[], 
  maxItems: number = 15
): string {
  if (!knowledge || knowledge.length === 0) return '';
  
  const prioritized = knowledge.slice(0, maxItems);
  
  const formatted = prioritized.map(k => 
    `[${k.category || 'general'}] ${k.title}:\n${truncateSafely(k.content || '', 400)}`
  ).join('\n\n');
  
  return `\n📚 KNOWLEDGE BASE ADMIN:\n${formatted}`;
}

/**
 * Build training examples context (few-shot learning)
 */
export function buildTrainingContext(
  examples: TrainingExample[], 
  maxExamples: number = 20
): string {
  if (!examples || examples.length === 0) return '';
  
  const prioritized = examples.slice(0, maxExamples);
  
  const formatted = prioritized.map(e => 
    `User: "${truncateSafely(e.question, 100)}"\nBot: "${truncateSafely(e.ideal_answer, 200)}"`
  ).join('\n\n');
  
  return `\n🎓 CONTOH RESPONS:\n${formatted}`;
}
