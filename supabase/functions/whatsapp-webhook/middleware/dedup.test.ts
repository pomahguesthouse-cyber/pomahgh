import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { __resetDedupCache, checkDuplicate, extractMessageId } from "./dedup.ts";

Deno.test("extractMessageId picks up common field names", () => {
  assertEquals(extractMessageId({ id: "abc" }), "abc");
  assertEquals(extractMessageId({ messageId: "x1" }), "x1");
  assertEquals(extractMessageId({ message_id: "x2" }), "x2");
  assertEquals(extractMessageId({ id: 12345 }), "12345");
  assertEquals(extractMessageId({ id: "  " }), null);
  assertEquals(extractMessageId({}), null);
  assertEquals(extractMessageId(null), null);
});

Deno.test("checkDuplicate flags repeated message_id", () => {
  __resetDedupCache();
  const args = { phone: "6281234", messageId: "abc-1", normalizedText: "halo" };
  assertEquals(checkDuplicate(args).skip, false);
  const second = checkDuplicate(args);
  assertEquals(second.skip, true);
  if (second.skip) assertEquals(second.reason, "duplicate_message_id");
});

Deno.test("checkDuplicate flags identical text within window", () => {
  __resetDedupCache();
  const phone = "6285656313680";
  const text = "hallo kak, izin tanya apakah di tanggal 17-18 bisa available?";
  // First call (no message id) → allowed.
  assertEquals(
    checkDuplicate({ phone, messageId: null, normalizedText: text }).skip,
    false,
  );
  // Second identical call within 90s → skipped.
  const dup = checkDuplicate({ phone, messageId: "different-id", normalizedText: text });
  assertEquals(dup.skip, true);
  if (dup.skip) assertEquals(dup.reason, "duplicate_identical_text");
});

Deno.test("checkDuplicate allows different text from same phone", () => {
  __resetDedupCache();
  const phone = "6281";
  assertEquals(
    checkDuplicate({ phone, messageId: null, normalizedText: "halo" }).skip,
    false,
  );
  assertEquals(
    checkDuplicate({ phone, messageId: null, normalizedText: "berapa harganya?" }).skip,
    false,
  );
});

Deno.test("checkDuplicate ignores empty text", () => {
  __resetDedupCache();
  const phone = "6281";
  assertEquals(checkDuplicate({ phone, messageId: null, normalizedText: "" }).skip, false);
  assertEquals(checkDuplicate({ phone, messageId: null, normalizedText: "  " }).skip, false);
});
