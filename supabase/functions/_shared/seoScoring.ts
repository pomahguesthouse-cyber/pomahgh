/**
 * SEO scoring helpers for the SEO Agent.
 * Pure functions — safe to use in any edge function.
 */

export interface SeoArticle {
  title: string;
  meta_description: string;
  long_description: string; // markdown
  image_alt?: string | null;
  internal_links_count?: number;
}

export interface SeoScoreResult {
  seo_score: number;             // 0-100
  word_count: number;
  keyword_density: number;       // ratio (0-1)
  readability_score: number;     // 0-100 (higher = easier)
  issues: Array<{ rule: string; message: string; severity: "info" | "warn" | "error" }>;
}

const stripMarkdown = (md: string): string =>
  md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const countOccurrences = (haystack: string, needle: string): number => {
  if (!needle) return 0;
  const re = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  return (haystack.match(re) ?? []).length;
};

const countSyllablesId = (word: string): number => {
  // Indonesian: count vowel groups (a, e, i, o, u)
  const m = word.toLowerCase().match(/[aeiou]+/g);
  return Math.max(1, m?.length ?? 1);
};

const fleschId = (text: string): number => {
  const sentences = Math.max(1, (text.match(/[.!?]+/g) ?? []).length);
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = Math.max(1, words.length);
  const syllables = words.reduce((sum, w) => sum + countSyllablesId(w), 0);
  // Adapted Flesch formula
  const score = 206.835 - 1.015 * (wordCount / sentences) - 84.6 * (syllables / wordCount);
  return Math.max(0, Math.min(100, Math.round(score * 100) / 100));
};

export function scoreArticle(article: SeoArticle, keyword: string): SeoScoreResult {
  const issues: SeoScoreResult["issues"] = [];
  const plain = stripMarkdown(article.long_description ?? "");
  const words = plain.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const kwLower = keyword.toLowerCase().trim();
  const titleHasKw = article.title.toLowerCase().includes(kwLower);
  const metaHasKw = (article.meta_description ?? "").toLowerCase().includes(kwLower);

  const h2Lines = (article.long_description ?? "")
    .split("\n")
    .filter((l) => /^##\s+/.test(l));
  const h2HasKw = h2Lines.some((l) => l.toLowerCase().includes(kwLower));

  const occurrences = countOccurrences(plain, kwLower);
  const density = wordCount > 0 ? occurrences / wordCount : 0;

  const internalLinks = article.internal_links_count ?? 0;
  const altOk = !!(article.image_alt && article.image_alt.trim().length > 0);

  let score = 0;
  if (titleHasKw) score += 20;
  else issues.push({ rule: "title_keyword", message: "Keyword utama tidak ada di judul", severity: "warn" });

  if (metaHasKw) score += 15;
  else issues.push({ rule: "meta_keyword", message: "Keyword tidak ada di meta description", severity: "warn" });

  if (h2HasKw) score += 15;
  else issues.push({ rule: "h2_keyword", message: "Keyword tidak muncul di H2", severity: "info" });

  if (density >= 0.01 && density <= 0.03) score += 20;
  else
    issues.push({
      rule: "density",
      message: `Keyword density ${(density * 100).toFixed(2)}% di luar rentang 1-3%`,
      severity: "info",
    });

  if (wordCount >= 800) score += 15;
  else issues.push({ rule: "word_count", message: `Hanya ${wordCount} kata, target ≥800`, severity: "warn" });

  if (internalLinks >= 1) score += 10;
  else issues.push({ rule: "internal_link", message: "Tidak ada internal link", severity: "warn" });

  if (altOk) score += 5;
  else issues.push({ rule: "image_alt", message: "Image alt kosong", severity: "warn" });

  return {
    seo_score: Math.min(100, score),
    word_count: wordCount,
    keyword_density: Math.round(density * 10000) / 10000,
    readability_score: fleschId(plain),
    issues,
  };
}

export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

export const normalizeKeyword = (kw: string): string =>
  kw.toLowerCase().trim().replace(/\s+/g, " ");