import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { scoreArticle, slugify, type SeoArticle } from "../_shared/seoScoring.ts";

/**
 * Generate 1 artikel + thumbnail untuk 1 keyword qualified.
 * Steps: article → image → publish → evaluate.
 * Setiap step direkam ke seo_agent_runs.
 */

interface ReqBody {
  keywordId: string;
}

interface ArticleOutput {
  title: string;
  slug: string;
  meta_description: string;
  category: string;
  short_description: string;
  long_description: string;
  tips?: string;
  best_time_to_visit?: string;
  price_range?: string;
  address?: string;
  image_alt: string;
  image_prompt: string;
}

const articleTool = {
  type: "function",
  function: {
    name: "publish_article",
    description: "Generate artikel SEO untuk halaman Seputar Semarang",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Judul artikel, mengandung keyword utama, ≤70 karakter" },
        slug: { type: "string", description: "URL slug, lowercase, kata dipisah strip" },
        meta_description: { type: "string", description: "≤160 karakter, mengandung keyword" },
        category: { type: "string", enum: ["accommodation", "attraction", "culinary", "event", "shopping", "culture"] },
        short_description: { type: "string", description: "≤200 karakter ringkasan" },
        long_description: {
          type: "string",
          description:
            "Markdown ≥800 kata. Gunakan H2 (##) dan H3 (###). Sertakan minimal 1 internal link " +
            "ke /rooms/{slug} atau /booking dari daftar internalLinkTargets. Hindari klaim faktual " +
            "yang tidak bisa diverifikasi (jam buka, harga spesifik). Akhiri dengan disclaimer.",
        },
        tips: { type: "string" },
        best_time_to_visit: { type: "string" },
        price_range: { type: "string" },
        address: { type: "string" },
        image_alt: { type: "string", description: "Alt text 8-15 kata yang deskriptif & SEO-friendly" },
        image_prompt: {
          type: "string",
          description: "Prompt fotografi untuk thumbnail (English ok), tanpa orang berwajah dekat",
        },
      },
      required: [
        "title",
        "slug",
        "meta_description",
        "category",
        "short_description",
        "long_description",
        "image_alt",
        "image_prompt",
      ],
    },
  },
};

const callArticleAI = async (
  apiKey: string,
  model: string,
  keyword: string,
  intent: string,
  tone: string,
  minWords: number,
  internalLinkTargets: string[],
  disclaimer: string
): Promise<{ output: ArticleOutput; tokens: number }> => {
  const linkList = internalLinkTargets.length
    ? internalLinkTargets.map((s) => `- ${s}`).join("\n")
    : "- /booking\n- /rooms";

  const systemPrompt = [
    "Kamu adalah SEO copywriter ahli untuk Pomah Guesthouse di Semarang.",
    `Tone: ${tone}.`,
    `Bahasa: Indonesia. Target panjang: ≥${minWords} kata.`,
    "Sertakan keyword utama 3-7 kali secara natural di seluruh artikel (judul, meta, H2, body).",
    "Struktur: pembuka menarik → 3-5 H2 dengan subtopik → tips/FAQ → CTA ke booking Pomah.",
    "Internal link wajib (gunakan markdown link) ke salah satu path berikut:",
    linkList,
    "Hindari informasi yang berpotensi salah (jam operasional spesifik, harga pasti, nomor telepon).",
    `Akhiri body dengan blockquote disclaimer: "> ${disclaimer}".`,
    "Jangan menyalin teks dari sumber lain. Gunakan pengetahuan umum.",
  ].join("\n");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content:
            `Keyword utama: "${keyword}"\nIntent: ${intent}\n\n` +
            "Buat artikel SEO lengkap untuk halaman Seputar Semarang.",
        },
      ],
      tools: [articleTool],
      tool_choice: { type: "function", function: { name: "publish_article" } },
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error("Lovable AI rate limit. Coba lagi nanti.");
    if (res.status === 402) throw new Error("Kredit Lovable AI habis.");
    throw new Error(`AI gateway error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("AI tidak mengembalikan tool call");
  const output = JSON.parse(args) as ArticleOutput;
  const tokens = data.usage?.total_tokens ?? 0;
  return { output, tokens };
};

const callImageAI = async (
  apiKey: string,
  model: string,
  prompt: string
): Promise<{ base64: string; mime: string }> => {
  const fullPrompt =
    `${prompt}. Photorealistic, warm natural lighting, Semarang Indonesia atmosphere, ` +
    "high detail, editorial photography style, no text overlay, no watermark.";

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: fullPrompt }],
      modalities: ["image", "text"],
    }),
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error("Image AI rate limit");
    if (res.status === 402) throw new Error("Image AI credits exhausted");
    throw new Error(`Image AI error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const url: string | undefined = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url || !url.startsWith("data:")) throw new Error("Image AI tidak mengembalikan gambar");
  const match = url.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Format data URL gambar tidak valid");
  return { mime: match[1], base64: match[2] };
};

const ensureUniqueSlug = async (
  supabase: ReturnType<typeof createClient>,
  base: string
): Promise<string> => {
  let slug = slugify(base);
  if (!slug) slug = `artikel-${Date.now()}`;
  let suffix = 0;
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const { data } = await supabase
      .from("city_attractions")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    suffix++;
    if (suffix > 50) return `${slug}-${Date.now()}`;
  }
};

const countInternalLinks = (md: string, targets: string[]): number => {
  const re = /\]\((\/[^)]+)\)/g;
  const found = new Set<string>();
  let m;
  while ((m = re.exec(md)) !== null) found.add(m[1]);
  if (targets.length === 0) return found.size;
  return [...found].filter((p) => targets.some((t) => p.startsWith(t))).length;
};

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const startedAt = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const supabase = createClient(supabaseUrl, serviceKey);

  const log = async (
    keywordId: string | null,
    step: string,
    status: string,
    extra: Record<string, unknown> = {}
  ) => {
    await supabase.from("seo_agent_runs").insert({
      keyword_id: keywordId,
      step,
      status,
      duration_ms: Date.now() - startedAt,
      ...extra,
    });
  };

  let keywordId: string | null = null;

  try {
    if (!lovableKey) throw new Error("LOVABLE_API_KEY missing");

    // Auth
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as ReqBody;
    keywordId = body.keywordId;
    if (!keywordId) throw new Error("keywordId required");

    // Load keyword + settings
    const { data: kw, error: kwErr } = await supabase
      .from("seo_keywords")
      .select("*")
      .eq("id", keywordId)
      .single();
    if (kwErr) throw kwErr;
    if (kw.status !== "qualified") throw new Error(`Keyword status '${kw.status}' bukan qualified`);

    const { data: settings } = await supabase
      .from("seo_agent_settings")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (!settings) throw new Error("seo_agent_settings tidak ditemukan");

    // Daily limit check
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const { count: todayCount } = await supabase
      .from("seo_keywords")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .gte("processed_at", since.toISOString());
    if ((todayCount ?? 0) >= settings.daily_generate_limit) {
      throw new Error(`Daily limit ${settings.daily_generate_limit} artikel sudah tercapai`);
    }

    // Mark generating
    await supabase.from("seo_keywords").update({ status: "generating" }).eq("id", keywordId);

    // === Step A: Article ===
    const articleStart = Date.now();
    const { output: article, tokens } = await callArticleAI(
      lovableKey,
      settings.model_text,
      kw.keyword,
      kw.intent_category ?? "attraction",
      settings.article_tone,
      settings.article_min_words,
      settings.internal_link_targets ?? [],
      settings.disclaimer_footer
    );
    await log(keywordId, "article", "success", {
      model_used: settings.model_text,
      tokens_used: tokens,
      duration_ms: Date.now() - articleStart,
      payload: { title: article.title },
    });

    // === Step B: Image ===
    const imageStart = Date.now();
    let imageUrl: string | null = null;
    try {
      const { base64, mime } = await callImageAI(lovableKey, settings.model_image, article.image_prompt);
      const ext = mime.split("/")[1] ?? "png";
      const path = `seo-agent/${slugify(article.title)}-${Date.now()}.${ext}`;
      const bin = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const { error: upErr } = await supabase.storage
        .from("attraction-images")
        .upload(path, bin, { contentType: mime, upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("attraction-images").getPublicUrl(path);
      imageUrl = pub.publicUrl;
      await log(keywordId, "image", "success", {
        model_used: settings.model_image,
        duration_ms: Date.now() - imageStart,
        payload: { url: imageUrl },
      });
    } catch (imgErr) {
      console.error("[generate] image failed:", imgErr);
      await log(keywordId, "image", "failed", {
        model_used: settings.model_image,
        duration_ms: Date.now() - imageStart,
        error_message: imgErr instanceof Error ? imgErr.message : String(imgErr),
      });
      // continue without image
    }

    // === Step C: Publish ===
    const slug = await ensureUniqueSlug(supabase, article.slug || article.title);
    const insertPayload = {
      name: article.title,
      slug,
      description: article.short_description,
      long_description: article.long_description,
      meta_description: article.meta_description,
      category: article.category,
      image_url: imageUrl,
      image_alt: article.image_alt,
      tips: article.tips ?? null,
      best_time_to_visit: article.best_time_to_visit ?? null,
      price_range: article.price_range ?? null,
      address: article.address ?? null,
      is_active: settings.auto_publish,
      is_featured: false,
      created_by_agent: true,
      agent_keyword_id: keywordId,
    };
    const { data: attraction, error: insErr } = await supabase
      .from("city_attractions")
      .insert(insertPayload)
      .select("id")
      .single();
    if (insErr) throw insErr;

    await supabase
      .from("seo_keywords")
      .update({
        status: "published",
        attraction_id: attraction.id,
        processed_at: new Date().toISOString(),
      })
      .eq("id", keywordId);

    await log(keywordId, "publish", "success", {
      attraction_id: attraction.id,
      payload: { slug, auto_published: settings.auto_publish },
    });

    // === Step D: Evaluate ===
    const seoArticle: SeoArticle = {
      title: article.title,
      meta_description: article.meta_description,
      long_description: article.long_description,
      image_alt: article.image_alt,
      internal_links_count: countInternalLinks(
        article.long_description,
        settings.internal_link_targets ?? []
      ),
    };
    const score = scoreArticle(seoArticle, kw.keyword);
    await log(keywordId, "evaluate", "success", {
      attraction_id: attraction.id,
      seo_score: score.seo_score,
      readability_score: score.readability_score,
      keyword_density: score.keyword_density,
      word_count: score.word_count,
      issues: score.issues,
    });

    return new Response(
      JSON.stringify({
        success: true,
        attraction_id: attraction.id,
        slug,
        seo_score: score.seo_score,
        word_count: score.word_count,
        auto_published: settings.auto_publish,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[seo-agent-generate] error:", error);
    if (keywordId) {
      await supabase.from("seo_keywords").update({ status: "failed" }).eq("id", keywordId);
      await log(keywordId, "publish", "failed", { error_message: msg });
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});