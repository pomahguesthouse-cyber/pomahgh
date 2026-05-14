/**
 * Compose a chatbot reply augmented with semantically-matched training examples.
 *
 * Designed for rule-based agents (e.g. booking flow) that historically emit
 * static templated replies. The helper enriches those replies with the
 * hotel's curated training-example style WHILE keeping deterministic facts
 * (dates, prices, room counts) as ground truth.
 *
 * Returns the composed string, or the provided `fallback` string if the LLM
 * call / embedding lookup fails. Never throws.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchSemanticTrainingExamples } from "./embeddings.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export interface ComposeReplyParams {
  supabase: ReturnType<typeof createClient>;
  userMessage: string;
  /** Ground-truth facts the LLM MUST preserve verbatim (dates, prices, room list). */
  facts: string;
  /** Persona / situation instruction for the LLM. */
  instruction: string;
  /** Deterministic fallback if LLM/embedding fails. */
  fallback: string;
  /** Recent conversation snippets for style continuity (optional). */
  recentMessages?: Array<{ role: string; content: string }>;
  /** Override model. Default google/gemini-2.5-flash. */
  model?: string;
  /** Min similarity threshold (default 0.5 — slightly looser for booking phrasing). */
  minSimilarity?: number;
  /** Max examples to inject (default 4). */
  maxExamples?: number;
}

export async function composeReplyWithTraining(p: ComposeReplyParams): Promise<string> {
  if (!LOVABLE_API_KEY) return p.fallback;

  try {
    const examples = await fetchSemanticTrainingExamples(
      p.supabase,
      p.userMessage,
      "match_training_examples",
      p.maxExamples ?? 4,
      p.minSimilarity ?? 0.5,
    );

    const exampleBlock = examples.length
      ? examples
          .map(
            (e, i) =>
              `Contoh ${i + 1} (sim ${e.similarity.toFixed(2)}):\nTamu: ${e.question}\nIdeal: ${e.ideal_answer}`,
          )
          .join("\n\n")
      : "(tidak ada contoh relevan — gunakan gaya alami sopan singkat)";

    const historyBlock = (p.recentMessages ?? [])
      .slice(-4)
      .map((m) => `${m.role === "user" ? "Tamu" : "Bot"}: ${m.content}`)
      .join("\n");

    const system = [
      "Kamu adalah chatbot Pomah Guesthouse. Tugasmu menulis ULANG balasan booking",
      "agar terdengar natural, hangat, dan konsisten dengan gaya contoh training.",
      "ATURAN MUTLAK:",
      "1. JANGAN mengubah angka, tanggal, harga, jumlah kamar, atau nama kamar di FAKTA.",
      "2. JANGAN menambah info baru yang tidak ada di FAKTA (no halusinasi harga/diskon/promo).",
      "3. Format tanggal WAJIB dd/MM/yyyy. Format Rupiah pakai 'Rp' + titik ribuan.",
      "4. Maksimal 1 emoji. Singkat 2-4 kalimat. Bahasa Indonesia santai sopan.",
      "5. Jangan pakai salam pembuka berlebihan ('Halo kak...') jika sudah di tengah percakapan.",
      "6. Output HANYA teks balasan, tanpa kutip atau penjelasan meta.",
    ].join(" ");

    const user = [
      `INSTRUKSI SITUASI:\n${p.instruction}`,
      `\nFAKTA (ground truth — wajib tampil apa adanya):\n${p.facts}`,
      `\nPESAN TAMU TERAKHIR:\n${p.userMessage}`,
      historyBlock ? `\nRIWAYAT SINGKAT:\n${historyBlock}` : "",
      `\nCONTOH GAYA DARI TRAINING:\n${exampleBlock}`,
      `\nTulis balasan final sekarang.`,
    ].join("\n");

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const resp = await fetch(GATEWAY_URL, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: p.model ?? "google/gemini-2.5-flash",
        temperature: 0.4,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    }).finally(() => clearTimeout(timer));

    if (!resp.ok) {
      console.warn(`[composeReplyWithTraining] gateway ${resp.status}`);
      return p.fallback;
    }
    const json = await resp.json();
    const text: string = json?.choices?.[0]?.message?.content?.trim?.() ?? "";
    if (!text || text.length < 5) return p.fallback;
    return text;
  } catch (e) {
    console.warn("[composeReplyWithTraining] error:", (e as Error).message);
    return p.fallback;
  }
}