import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_TOKEN = Deno.env.get("WHATSAPP_WEBHOOK_TOKEN")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

interface ScenarioStep {
  user_message: string;
  expected_assertions?: string[];
}

/* ---------- Deterministic assertions ---------- */
const ASSERTIONS: Record<string, (botReply: string, ctx: { allBotText: string; userMsg: string }) => boolean> = {
  mentions_check_in_date: (r) => /\d{1,2}\/\d{1,2}\/\d{4}/.test(r) || /\d{1,2}\s*(jan|feb|mar|apr|mei|jun|jul|agt|agu|sep|okt|nov|des)/i.test(r),
  mentions_room_or_availability: (r) => /(deluxe|family\s*suite|grand\s*deluxe|single|tersedia|kamar|availabilit)/i.test(r),
  contains_price_rupiah: (r) => /Rp\s?\d/i.test(r),
  asks_guest_data: (r) => /(nama|email|hp|telepon|jumlah\s*tamu|data\s+(lengkap|tamu|diri))/i.test(r),
  mentions_payment_or_bca: (r) => /(bca|transfer|pembayaran|rekening|0095584379)/i.test(r),
  mentions_booking_code: (r) => /PMH-[A-Z0-9]+/i.test(r),
  no_escalation: (r) => !/diteruskan ke admin|sudah saya teruskan/i.test(r),
  escalated_to_admin: (r) => /diteruskan ke admin|sudah saya teruskan/i.test(r),
  proper_date_format: (r) => !/(\d{1,2}\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{4})/.test(r),
  short_response: (r) => r.length <= 800,
};

function runDeterministicAssertions(
  botReply: string,
  userMsg: string,
  expected: string[] | undefined,
  allBotText: string,
) {
  const list = expected ?? [];
  return list.map((name) => {
    const fn = ASSERTIONS[name];
    if (!fn) return { name, passed: false, reason: "unknown_assertion" };
    try {
      const passed = fn(botReply, { allBotText, userMsg });
      return { name, passed, reason: passed ? "" : "did not match expected pattern" };
    } catch (err) {
      return { name, passed: false, reason: (err as Error).message };
    }
  });
}

/* ---------- Webhook caller ---------- */
async function callWebhook(phone: string, message: string): Promise<void> {
  const url = `${SUPABASE_URL}/functions/v1/whatsapp-webhook`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-webhook-token": WEBHOOK_TOKEN,
    },
    body: JSON.stringify({
      sender: phone,
      message,
      device: "test-runner",
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`webhook ${res.status}: ${text.slice(0, 200)}`);
  }
  await res.text().catch(() => "");
}

/** Wait for a new assistant message to appear in chat_messages after `since`. */
async function waitForBotReply(
  supabase: SupabaseClient,
  conversationId: string,
  since: string,
  timeoutMs = 25000,
): Promise<string | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data } = await supabase
      .from("chat_messages")
      .select("content, created_at")
      .eq("conversation_id", conversationId)
      .eq("role", "assistant")
      .gt("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1);
    if (data && data.length > 0) return data[0].content as string;
    await new Promise((r) => setTimeout(r, 600));
  }
  return null;
}

async function getOrCreateTestConversationId(
  supabase: SupabaseClient,
  phone: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("whatsapp_sessions")
    .select("conversation_id")
    .eq("phone_number", phone)
    .maybeSingle();
  return data?.conversation_id ?? null;
}

/* ---------- AI evaluator ---------- */
async function evaluateRunWithAI(transcript: Array<{ role: string; content: string }>) {
  const sysPrompt = `Anda adalah evaluator AI untuk chatbot guesthouse Pomah.
Nilai transcript percakapan dengan rubrik berikut (skor 0-100 per kategori):
- accuracy_score: ketepatan info (tanggal, harga, nama kamar, format dd/MM/yyyy, format Rupiah).
- tone_score: kesesuaian persona (max 1 emoji, ringkas 2-3 kalimat, sopan, panggil "kak").
- escalation_score: ketepatan eskalasi (multi-room/refund/update PMH- HARUS eskalasi; booking normal jangan eskalasi).

Kembalikan HANYA JSON valid:
{
  "overall_score": int,
  "accuracy_score": int,
  "tone_score": int,
  "escalation_score": int,
  "summary": "ringkasan 1-2 kalimat",
  "recommendations": "saran perbaikan konkret 2-3 poin"
}`;

  const userPrompt = `Transcript:\n${transcript
    .map((m) => `${m.role === "assistant" ? "BOT" : "TAMU"}: ${m.content}`)
    .join("\n\n")}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: sysPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`AI eval ${res.status}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(content);
}

/* ---------- Run engine ---------- */
function genTestPhone(): string {
  const suffix = Math.floor(10000 + Math.random() * 89999).toString();
  return `6299999${suffix}`;
}

async function executeSteps(
  supabase: SupabaseClient,
  runId: string,
  testPhone: string,
  steps: ScenarioStep[],
): Promise<{ allBotText: string; transcript: Array<{ role: string; content: string }> }> {
  let allBotText = "";
  const transcript: Array<{ role: string; content: string }> = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepStart = Date.now();
    const sinceTs = new Date().toISOString();

    // Log user message
    await supabase.from("chat_test_messages").insert({
      run_id: runId,
      step_index: i,
      role: "user",
      content: step.user_message,
    });
    transcript.push({ role: "user", content: step.user_message });

    // Send to webhook
    try {
      await callWebhook(testPhone, step.user_message);
    } catch (err) {
      const errMsg = (err as Error).message;
      await supabase.from("chat_test_messages").insert({
        run_id: runId,
        step_index: i,
        role: "system",
        content: `webhook call failed: ${errMsg}`,
        latency_ms: Date.now() - stepStart,
      });
      continue;
    }

    // Wait small delay for batcher to settle, then resolve conversation_id (lazily after first msg)
    await new Promise((r) => setTimeout(r, 1200));
    const convId = await getOrCreateTestConversationId(supabase, testPhone);
    if (!convId) {
      await supabase.from("chat_test_messages").insert({
        run_id: runId,
        step_index: i,
        role: "system",
        content: "conversation not created",
      });
      continue;
    }
    await supabase.from("chat_test_runs").update({ test_conversation_id: convId }).eq("id", runId);

    // Wait for bot reply
    const botReply = await waitForBotReply(supabase, convId, sinceTs);
    const latencyMs = Date.now() - stepStart;

    if (!botReply) {
      await supabase.from("chat_test_messages").insert({
        run_id: runId,
        step_index: i,
        role: "system",
        content: "(timeout: no bot reply within 25s)",
        latency_ms: latencyMs,
      });
      continue;
    }

    allBotText += "\n" + botReply;
    const assertions = runDeterministicAssertions(
      botReply,
      step.user_message,
      step.expected_assertions,
      allBotText,
    );

    await supabase.from("chat_test_messages").insert({
      run_id: runId,
      step_index: i,
      role: "bot",
      content: botReply,
      assertions,
      latency_ms: latencyMs,
    });
    transcript.push({ role: "assistant", content: botReply });
  }

  return { allBotText, transcript };
}

async function finalizeRun(
  supabase: SupabaseClient,
  runId: string,
  transcript: Array<{ role: string; content: string }>,
) {
  // Fetch all assertions
  const { data: msgs } = await supabase
    .from("chat_test_messages")
    .select("assertions")
    .eq("run_id", runId);

  let totalAssertions = 0;
  let passedAssertions = 0;
  for (const m of msgs ?? []) {
    const arr = (m.assertions ?? []) as Array<{ passed: boolean }>;
    for (const a of arr) {
      totalAssertions += 1;
      if (a.passed) passedAssertions += 1;
    }
  }
  const assertionPct = totalAssertions > 0 ? Math.round((passedAssertions / totalAssertions) * 100) : 100;

  let aiEval: any = null;
  try {
    aiEval = await evaluateRunWithAI(transcript);
  } catch (err) {
    console.warn("[runner] AI eval failed:", (err as Error).message);
  }

  const accuracy = aiEval?.accuracy_score ?? assertionPct;
  const tone = aiEval?.tone_score ?? 80;
  const escalation = aiEval?.escalation_score ?? 80;
  const overall = aiEval?.overall_score ?? Math.round((accuracy + tone + escalation) / 3);
  const status = totalAssertions > 0 && passedAssertions < totalAssertions ? "failed" : overall >= 70 ? "passed" : "failed";

  await supabase
    .from("chat_test_runs")
    .update({
      status,
      overall_score: overall,
      accuracy_score: accuracy,
      tone_score: tone,
      escalation_score: escalation,
      summary: aiEval?.summary ?? `${passedAssertions}/${totalAssertions} assertions passed`,
      recommendations: aiEval?.recommendations ?? null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", runId);
}

/* ---------- Auth ---------- */
async function requireAdmin(req: Request): Promise<{ supabase: SupabaseClient; userId: string } | Response> {
  const auth = req.headers.get("Authorization");
  if (!auth) {
    return new Response(JSON.stringify({ error: "missing auth" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "invalid token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const adminSupabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: roleRow } = await adminSupabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleRow) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return { supabase: adminSupabase, userId: user.id };
}

/* ---------- Handlers ---------- */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authResult = await requireAdmin(req);
  if (authResult instanceof Response) return authResult;
  const { supabase, userId } = authResult;

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "start_scenario";
  const body = await req.json().catch(() => ({}));

  try {
    if (action === "start_scenario") {
      const { scenario_id } = body as { scenario_id: string };
      if (!scenario_id) throw new Error("scenario_id required");
      const { data: scenario, error } = await supabase
        .from("chat_test_scenarios")
        .select("steps, name")
        .eq("id", scenario_id)
        .maybeSingle();
      if (error || !scenario) throw new Error("scenario not found");

      const testPhone = genTestPhone();
      const { data: runRow, error: runErr } = await supabase
        .from("chat_test_runs")
        .insert({
          scenario_id,
          mode: "scenario",
          test_phone: testPhone,
          triggered_by: userId,
          status: "running",
        })
        .select("id")
        .maybeSingle();
      if (runErr || !runRow) throw new Error("failed to create run");

      const runId = runRow.id;

      // Run async (fire-and-forget) but await for ergonomics — scenarios are short.
      const { transcript } = await executeSteps(
        supabase,
        runId,
        testPhone,
        scenario.steps as ScenarioStep[],
      );
      await finalizeRun(supabase, runId, transcript);

      return new Response(JSON.stringify({ run_id: runId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "live_step") {
      const { run_id, message } = body as { run_id?: string; message: string };
      if (!message) throw new Error("message required");
      let runId = run_id;
      let testPhone: string;

      if (!runId) {
        testPhone = genTestPhone();
        const { data: runRow, error: runErr } = await supabase
          .from("chat_test_runs")
          .insert({ mode: "live", test_phone: testPhone, triggered_by: userId, status: "running" })
          .select("id, test_phone")
          .maybeSingle();
        if (runErr || !runRow) throw new Error("failed to create live run");
        runId = runRow.id;
      } else {
        const { data: existing } = await supabase
          .from("chat_test_runs")
          .select("test_phone")
          .eq("id", runId)
          .maybeSingle();
        if (!existing) throw new Error("run not found");
        testPhone = existing.test_phone;
      }

      const { data: prevMessages } = await supabase
        .from("chat_test_messages")
        .select("step_index")
        .eq("run_id", runId!)
        .order("step_index", { ascending: false })
        .limit(1);
      const nextStepIndex = prevMessages && prevMessages.length > 0 ? prevMessages[0].step_index + 1 : 0;

      const { transcript } = await executeSteps(supabase, runId!, testPhone, [
        { user_message: message, expected_assertions: [] },
      ]);
      // Adjust step_index for live append: re-update last 2 inserted rows
      await supabase
        .from("chat_test_messages")
        .update({ step_index: nextStepIndex })
        .eq("run_id", runId!)
        .eq("step_index", 0)
        .gt("created_at", new Date(Date.now() - 60000).toISOString());

      const lastBot = transcript.filter((m) => m.role === "assistant").pop()?.content ?? null;
      return new Response(JSON.stringify({ run_id: runId, last_reply: lastBot }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "start_replay") {
      const { source_conversation_id } = body as { source_conversation_id: string };
      if (!source_conversation_id) throw new Error("source_conversation_id required");
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("role, content, created_at")
        .eq("conversation_id", source_conversation_id)
        .eq("role", "user")
        .order("created_at", { ascending: true });
      if (!msgs || msgs.length === 0) throw new Error("no user messages found");

      const steps: ScenarioStep[] = msgs.map((m) => ({
        user_message: m.content,
        expected_assertions: [],
      }));

      const testPhone = genTestPhone();
      const { data: runRow } = await supabase
        .from("chat_test_runs")
        .insert({
          mode: "replay",
          source_conversation_id,
          test_phone: testPhone,
          triggered_by: userId,
          status: "running",
        })
        .select("id")
        .maybeSingle();
      if (!runRow) throw new Error("failed to create replay run");

      const { transcript } = await executeSteps(supabase, runRow.id, testPhone, steps);
      await finalizeRun(supabase, runRow.id, transcript);

      return new Response(JSON.stringify({ run_id: runRow.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "evaluate_run") {
      const { run_id } = body as { run_id: string };
      if (!run_id) throw new Error("run_id required");
      const { data: msgs } = await supabase
        .from("chat_test_messages")
        .select("role, content, step_index")
        .eq("run_id", run_id)
        .order("step_index", { ascending: true });
      const transcript = (msgs ?? [])
        .filter((m) => m.role === "user" || m.role === "bot")
        .map((m) => ({ role: m.role === "bot" ? "assistant" : "user", content: m.content }));
      await finalizeRun(supabase, run_id, transcript);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[chatbot-test-runner] error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});