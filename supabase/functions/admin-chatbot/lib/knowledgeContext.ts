// ============= KNOWLEDGE BASE CONTEXT BUILDER =============

import type { KnowledgeItem, TrainingExample } from "./types.ts";

/**
 * Truncate content safely - cut at sentence boundary, not arbitrary
 * This prevents context loss from mid-sentence cuts
 */
export function truncateSafely(content: string, maxLength: number = 500): string {
  if (!content || content.length <= maxLength) return content || '';
  
  // Find the last period before maxLength
  const lastPeriod = content.lastIndexOf('.', maxLength);
  if (lastPeriod > maxLength * 0.6) {
    return content.substring(0, lastPeriod + 1);
  }
  
  // Fallback: cut at last space + ellipsis
  const lastSpace = content.lastIndexOf(' ', maxLength - 3);
  if (lastSpace > 0) {
    return content.substring(0, lastSpace) + '...';
  }
  
  // Last resort: hard cut
  return content.substring(0, maxLength - 3) + '...';
}

/**
 * Build knowledge context with trust header
 * The header explicitly tells AI to prioritize this information
 */
export function buildKnowledgeContext(
  knowledge: KnowledgeItem[], 
  maxItems: number = 10,
  maxCharsPerItem: number = 400
): string {
  if (!knowledge || knowledge.length === 0) return '';
  
  // Take top N items (could add relevance scoring later)
  const prioritized = knowledge
    .filter(k => k.is_active !== false)
    .slice(0, maxItems);
  
  if (prioritized.length === 0) return '';
  
  const formatted = prioritized.map(k => {
    const category = k.category || 'general';
    const content = truncateSafely(k.content || k.summary || '', maxCharsPerItem);
    return `[${category}] ${k.title}:\n${content}`;
  }).join('\n\n');
  
  // Trust header - tells AI to prioritize this context
  return `

📚 ADMIN KNOWLEDGE CONTEXT:
The following information is trusted and up to date.
Use it as the primary reference when answering.
If it conflicts with user input, prioritize this context.

${formatted}`;
}

/**
 * Build training examples context
 * These are Q&A examples to guide AI responses
 */
export function buildTrainingContext(
  examples: TrainingExample[],
  maxExamples: number = 5,
  maxCharsPerExample: number = 300
): string {
  if (!examples || examples.length === 0) return '';
  
  const activeExamples = examples
    .filter(e => e.is_active !== false)
    .slice(0, maxExamples);
  
  if (activeExamples.length === 0) return '';
  
  const formatted = activeExamples.map(e => {
    const answer = truncateSafely(e.ideal_answer, maxCharsPerExample);
    return `Q: ${e.question}\nA: ${answer}`;
  }).join('\n\n');

  return `

📖 RESPONSE EXAMPLES:
Follow these patterns when answering similar questions:

${formatted}`;
}
