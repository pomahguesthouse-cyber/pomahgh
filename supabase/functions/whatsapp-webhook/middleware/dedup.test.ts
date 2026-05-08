import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { __resetDedupCache, buildDedupKeys, checkDuplicate, extractMessageId } from "./dedup.ts";

/** Minimal in-memory mock of the Supabase client surface used by checkDuplicate. */
function createMockSupabase() {
  const rows = new Map<string, { dedup_key: string; phone_number: string; expires_at: string }>();

  // deno-lint-ignore no-explicit-any
  const builder = (key: string): any => ({
    upsert: (
      row: { dedup_key: string; phone_number: string; expires_at: string },
      _opts: { onConflict: string; ignoreDuplicates: boolean },
    ) => ({
      select: (_cols: string) => {
        if (rows.has(row.dedup_key)) {
          return Promise.resolve({ data: [], error: null });
        }
        rows.set(row.dedup_key, row);
        return Promise.resolve({ data: [{ dedup_key: row.dedup_key }], error: null });
      },
    }),
    select: (_cols: string) => ({
      eq: (_col: string, val: string) => ({
        maybeSingle: () =>
          Promise.resolve({ data: rows.get(val) ?? null, error: null }),
      }),
    }),
    update: (patch: { expires_at: string; phone_number: string }) => ({
      eq: (_col: string, val: string) => {
        const existing = rows.get(val);
        if (existing) rows.set(val, { ...existing, ...patch });
        return Promise.resolve({ data: null, error: null });
      },
    }),
    _table: key,
  });

  return {
    from: (table: string) => builder(table),
    rpc: (_name: string) => Promise.resolve({ data: null, error: null }),
    _rows: rows,
    // deno-lint-ignore no-explicit-any
  } as any;
}

Deno.test("extractMessageId picks up common field names", () => {
  assertEquals(extractMessageId({ id: "abc" }), "abc");
  assertEquals(extractMessageId({ messageId: "x1" }), "x1");
  assertEquals(extractMessageId({ message_id: "x2" }), "x2");
  assertEquals(extractMessageId({ id: 12345 }), "12345");
  assertEquals(extractMessageId({ id: "  " }), null);
  assertEquals(extractMessageId({}), null);
  assertEquals(extractMessageId(null), null);
});

Deno.test("buildDedupKeys constructs id + text keys", () => {
  const keys = buildDedupKeys({ phone: "6281", messageId: "abc", normalizedText: "halo" });
  assertEquals(keys.length, 2);
  assertEquals(keys[0].key, "mid:abc");
  assertEquals(keys[0].reason, "duplicate_message_id");
  assertEquals(keys[1].reason, "duplicate_identical_text");
  assertEquals(keys[1].key.startsWith("txt:6281:"), true);
});

Deno.test("buildDedupKeys skips empty text", () => {
  const keys = buildDedupKeys({ phone: "6281", messageId: "abc", normalizedText: "   " });
  assertEquals(keys.length, 1);
  assertEquals(keys[0].reason, "duplicate_message_id");
});

Deno.test("checkDuplicate flags repeated message_id (DB-backed)", async () => {
  __resetDedupCache();
  const supabase = createMockSupabase();
  const args = { phone: "6281234", messageId: "abc-1", normalizedText: "halo" };
  assertEquals((await checkDuplicate(supabase, args)).skip, false);
  const second = await checkDuplicate(supabase, args);
  assertEquals(second.skip, true);
  if (second.skip) assertEquals(second.reason, "duplicate_message_id");
});

Deno.test("checkDuplicate flags identical text within window (DB-backed)", async () => {
  __resetDedupCache();
  const supabase = createMockSupabase();
  const phone = "6285656313680";
  const text = "hallo kak, izin tanya apakah di tanggal 17-18 bisa available?";
  assertEquals(
    (await checkDuplicate(supabase, { phone, messageId: null, normalizedText: text })).skip,
    false,
  );
  const dup = await checkDuplicate(supabase, { phone, messageId: "different-id", normalizedText: text });
  assertEquals(dup.skip, true);
  if (dup.skip) assertEquals(dup.reason, "duplicate_identical_text");
});

Deno.test("checkDuplicate allows different text from same phone", async () => {
  __resetDedupCache();
  const supabase = createMockSupabase();
  const phone = "6281";
  assertEquals(
    (await checkDuplicate(supabase, { phone, messageId: null, normalizedText: "halo" })).skip,
    false,
  );
  assertEquals(
    (await checkDuplicate(supabase, { phone, messageId: null, normalizedText: "berapa harganya?" })).skip,
    false,
  );
});

Deno.test("checkDuplicate ignores empty text", async () => {
  __resetDedupCache();
  const supabase = createMockSupabase();
  const phone = "6281";
  assertEquals((await checkDuplicate(supabase, { phone, messageId: null, normalizedText: "" })).skip, false);
  assertEquals((await checkDuplicate(supabase, { phone, messageId: null, normalizedText: "  " })).skip, false);
});

Deno.test("checkDuplicate detects duplicate even when L1 cache is empty (cold-start scenario)", async () => {
  __resetDedupCache();
  const supabase = createMockSupabase();
  const args = { phone: "6281", messageId: "cold-1", normalizedText: "test" };

  // First isolate processes message
  const first = await checkDuplicate(supabase, args);
  assertEquals(first.skip, false);

  // Simulate cold start — L1 wiped, but DB row remains
  __resetDedupCache();

  // New isolate sees the same message_id → must still detect duplicate via DB
  const second = await checkDuplicate(supabase, args);
  assertEquals(second.skip, true);
  if (second.skip) assertEquals(second.reason, "duplicate_message_id");
});
