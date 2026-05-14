import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INTERNAL_SECRET = Deno.env.get("CHATBOT_TOOLS_INTERNAL_SECRET") || "";

type Table = "chatbot_training_examples" | "admin_chatbot_training_examples";
const TABLES: Table[] = ["chatbot_training_examples", "admin_chatbot_training_examples"];

interface Body {
  ids?: string[];
  table?: Table;
  force?: boolean;
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const resp = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: texts,
    }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`OpenAI embeddings ${resp.status}: ${t}`);
  }
  const json = await resp.json();
  return json.data.map((d: { embedding: number[] }) => d.embedding);
}

async function isAdmin(userId: string, supabase: ReturnType<typeof createClient>): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

async function processTable(
  supabase: ReturnType<typeof createClient>,
  table: Table,
  ids: string[] | undefined,
  force: boolean,
): Promise<{ table: Table; embedded: number; skipped: number }> {
  let q = supabase.from(table).select("id, question, ideal_answer, embedding_source, embedding");
  if (ids && ids.length > 0) q = q.in("id", ids);
  else if (!force) q = q.is("embedding", null);

  const { data: rows, error } = await q.limit(500);
  if (error) throw new Error(`load ${table}: ${error.message}`);
  if (!rows || rows.length === 0) return { table, embedded: 0, skipped: 0 };

  let embedded = 0;
  let skipped = 0;
  const BATCH = 50;

  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const sources = slice.map((r) => `${r.question}\n\n${r.ideal_answer}`.slice(0, 4000));
    // Skip rows whose source already matches stored embedding_source (idempotent)
    const needIdx: number[] = [];
    sources.forEach((s, idx) => {
      if (force || !slice[idx].embedding || slice[idx].embedding_source !== s) needIdx.push(idx);
      else skipped++;
    });
    if (needIdx.length === 0) continue;

    const inputs = needIdx.map((idx) => sources[idx]);
    const vectors = await embedBatch(inputs);

    await Promise.all(
      needIdx.map((idx, k) =>
        supabase
          .from(table)
          .update({
            embedding: vectors[k] as unknown as string,
            embedding_source: sources[idx],
          })
          .eq("id", slice[idx].id),
      ),
    );
    embedded += needIdx.length;
  }

  return { table, embedded, skipped };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Auth: internal secret OR admin user
    const internalHdr = req.headers.get("x-internal-secret") || "";
    const isInternal = INTERNAL_SECRET && internalHdr === INTERNAL_SECRET;

    if (!isInternal) {
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "");
      if (!token) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user || !(await isAdmin(user.id, supabase))) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let body: Body = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const targetTables = body.table ? [body.table] : TABLES;
    const results = [];
    for (const t of targetTables) {
      const r = await processTable(supabase, t, body.ids, body.force === true);
      results.push(r);
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("embed-training-examples error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});