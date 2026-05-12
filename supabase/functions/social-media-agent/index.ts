const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

const PLATFORM_INSTRUCTIONS: Record<string, string> = {
  instagram: `Instagram caption (maks 2200 karakter):
- Paragraf pendek, gunakan emoji secukupnya
- Akhiri dengan CTA (Call-to-Action)
- Sertakan 15-20 hashtag relevan (campuran besar & niche)
Format JSON: { "caption": "...", "hashtags": ["#tag1", ...], "cta": "..." }`,

  tiktok: `TikTok content:
- Hook kuat di 3 detik pertama (1 kalimat pembuka yang menarik)
- Script pendek 30-60 detik, poin-poin singkat
- 5-10 hashtag trending TikTok
Format JSON: { "hook": "...", "script": "...", "hashtags": ["#tag1", ...] }`,

  twitter: `Twitter/X post (maks 280 karakter):
- Langsung to the point
- Boleh pakai emoji minimal
- Tanpa hashtag berlebihan (maks 2)
Format JSON: { "tweet": "..." }`,

  linkedin: `LinkedIn post profesional:
- Tone bisnis tapi engaging
- 3-5 paragraf pendek
- Akhiri dengan pertanyaan atau insight
- 3-5 hashtag profesional
Format JSON: { "post": "...", "hashtags": ["#tag1", ...] }`,

  facebook: `Facebook post:
- Conversational, bisa lebih panjang dari Twitter
- Boleh pakai emoji
- CTA jelas (share, comment, dm)
- 3-5 hashtag
Format JSON: { "post": "...", "hashtags": ["#tag1", ...] }`,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY tidak dikonfigurasi" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { topic, platforms, tone, language, brandName, brandVoice, contentType } = body;

    if (!topic || !platforms?.length) {
      return new Response(JSON.stringify({ error: "topic dan platforms wajib diisi" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const langLabel = language === "id" ? "Bahasa Indonesia" : "English";
    const platformGuides = platforms
      .map((p: string) => `\n### ${p.toUpperCase()}\n${PLATFORM_INSTRUCTIONS[p] ?? ""}`)
      .join("\n");

    const systemPrompt = `Kamu adalah social media copywriter profesional untuk ${brandName || "bisnis"}.
Brand voice: ${brandVoice || "ramah, profesional, dan hangat"}.
Selalu tulis dalam ${langLabel}.
Tone: ${tone || "casual"}.
Tipe konten: ${contentType || "promo"}.

Tugasmu: buat konten untuk setiap platform yang diminta.
Kembalikan HANYA valid JSON dengan key nama platform (lowercase), tanpa markdown code block.`;

    const userPrompt = `Topik/tema konten: "${topic}"

Buat konten untuk platform berikut:
${platformGuides}

Kembalikan satu JSON object dengan key: ${platforms.join(", ")}.
Contoh struktur: { "instagram": {...}, "tiktok": {...} }`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", errText);
      return new Response(JSON.stringify({ error: "Gagal menghubungi AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResponse.json();
    const raw: string = data.choices?.[0]?.message?.content?.trim() ?? "{}";

    let results: unknown;
    try {
      const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      results = JSON.parse(cleaned);
    } catch {
      console.error("JSON parse failed, raw:", raw);
      return new Response(JSON.stringify({ error: "Respons AI tidak valid", raw }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("social-media-agent error:", err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
