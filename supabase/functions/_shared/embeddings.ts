/**
 * Shared embeddings helper for chatbot/admin-chatbot.
 * Uses OpenAI text-embedding-3-small (1536 dim).
 * Includes a small in-memory TTL cache (5 min, 200 entries).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const TTL_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 200;

interface CacheEntry { vec: number[]; expiresAt: number }
const cache = new Map<string, CacheEntry>();

function cacheKey(text: string): string {
  return text.trim().toLowerCase().slice(0, 500);
}

function cacheGet(key: string): number[] | null {
  const e = cache.get(key);
  if (!e) return null;
  if (e.expiresAt < Date.now()) { cache.delete(key); return null; }
  return e.vec;
}

function cacheSet(key: string, vec: number[]): void {
  if (cache.size >= MAX_ENTRIES) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { vec, expiresAt: Date.now() + TTL_MS });
}

export async function embedText(text: string): Promise<number[] | null> {
  if (!OPENAI_API_KEY || !text || text.trim().length < 2) return null;
  const key = cacheKey(text);
  const cached = cacheGet(key);
  if (cached) return cached;

  try {
    const resp = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text.slice(0, 4000),
      }),
    });
    if (!resp.ok) {
      console.warn(`[embedText] OpenAI ${resp.status}`);
      return null;
    }
    const json = await resp.json();
    const vec: number[] = json.data?.[0]?.embedding ?? null;
    if (vec) cacheSet(key, vec);
    return vec;
  } catch (e) {
    console.warn("[embedText] error:", (e as Error).message);
    return null;
  }
}

export interface SemanticTrainingMatch {
  id: string;
  question: string;
  ideal_answer: string;
  category: string | null;
  similarity: number;
  source?: "guest" | "admin";
}

/**
 * Fetch top-N semantically-similar training examples for the user message.
 * Returns [] on any failure so callers can fallback safely.
 */
export async function fetchSemanticTrainingExamples(
  supabase: ReturnType<typeof createClient>,
  userMessage: string,
  rpcName: "match_training_examples" | "match_admin_training_examples" = "match_training_examples",
  matchCount = 6,
  minSimilarity = 0.55,
): Promise<SemanticTrainingMatch[]> {
  const vec = await embedText(userMessage);
  if (!vec) return [];
  try {
    const { data, error } = await supabase.rpc(rpcName, {
      query_embedding: vec as unknown as string,
      match_count: matchCount,
      min_similarity: minSimilarity,
    });
    if (error) {
      console.warn(`[fetchSemanticTrainingExamples] rpc error: ${error.message}`);
      return [];
    }
    return (data || []) as SemanticTrainingMatch[];
  } catch (e) {
    console.warn("[fetchSemanticTrainingExamples] threw:", (e as Error).message);
    return [];
  }
}