/**
 * Server-side defense-in-depth sanitizer untuk pesan tamu.
 * Mirror dari src/features/chatbot/services/sanitizeUserInput.ts.
 */
const MAX_LENGTH = 1000;

const PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\b(abaikan|lupakan|hiraukan)\s+(semua\s+)?(instruksi|perintah|aturan|prompt)\s+(sebelumnya|di atas|sistem)?/gi, replacement: "[diblokir]" },
  { pattern: /\bignore\s+(all\s+)?(previous|above|prior|system)\s+(instruction|prompt|rule)s?/gi, replacement: "[blocked]" },
  { pattern: /\b(disregard|override)\s+(all\s+)?(previous|prior|system)\s+(instructions?|prompts?)/gi, replacement: "[blocked]" },
  { pattern: /\byou are now\b|\bact as\b|\bpretend (to be|you are)\b/gi, replacement: "[blocked]" },
  { pattern: /\b(kamu|anda)\s+(sekarang|adalah)\s+(developer|admin|root|sistem)\b/gi, replacement: "[diblokir]" },
  { pattern: /\b(berikan|kasih|beri)\s+(saya\s+)?(diskon|potongan)\s+(100|99|90)\s*%/gi, replacement: "[diblokir]" },
  { pattern: /\b(give me|grant)\s+(a\s+)?(100|99|90)\s*%\s+(discount|off)/gi, replacement: "[blocked]" },
  { pattern: /<\|?(system|assistant|user|im_start|im_end)\|?>/gi, replacement: "[blocked]" },
  { pattern: /^\s*(system|assistant|user)\s*:/gim, replacement: "tamu:" },
  { pattern: /```\s*(system|assistant)[\s\S]*?```/gi, replacement: "[blocked]" },
];

export interface SanitizeResult {
  text: string;
  modified: boolean;
  reasons: string[];
}

export function sanitizeChatInput(input: string): SanitizeResult {
  const reasons: string[] = [];
  let text = String(input ?? "").trim();
  if (text.length > MAX_LENGTH) {
    text = text.slice(0, MAX_LENGTH);
    reasons.push("truncated");
  }
  const cleaned = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  if (cleaned !== text) reasons.push("control_chars");
  text = cleaned;
  let modified = false;
  for (const { pattern, replacement } of PATTERNS) {
    if (pattern.test(text)) {
      text = text.replace(pattern, replacement);
      modified = true;
      reasons.push("injection_pattern");
    }
  }
  return { text, modified: modified || reasons.length > 0, reasons };
}
