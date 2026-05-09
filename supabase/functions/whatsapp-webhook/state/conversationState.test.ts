import { assert, assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  isValidState,
  isAllowedTransition,
  getState,
  CONVERSATION_STATES,
} from "./conversationState.ts";

Deno.test("isValidState — accepts known states only", () => {
  for (const s of CONVERSATION_STATES) assert(isValidState(s));
  assert(!isValidState("foo"));
  assert(!isValidState(null));
  assert(!isValidState(undefined));
  assert(!isValidState(42));
});

Deno.test("isAllowedTransition — null/unknown from is permissive", () => {
  assert(isAllowedTransition(null, "idle"));
  assert(isAllowedTransition(undefined, "awaiting_name"));
});

Deno.test("isAllowedTransition — happy paths", () => {
  assert(isAllowedTransition("idle", "awaiting_name"));
  assert(isAllowedTransition("awaiting_name", "idle"));
  assert(isAllowedTransition("booking_in_progress", "awaiting_payment_proof"));
  assert(isAllowedTransition("awaiting_payment_proof", "awaiting_payment_approval"));
  assert(isAllowedTransition("awaiting_payment_approval", "idle"));
  assert(isAllowedTransition("awaiting_payment_approval", "awaiting_payment_proof"));
});

Deno.test("isAllowedTransition — takeover & closed are reachable from any state", () => {
  for (const s of CONVERSATION_STATES) {
    assert(isAllowedTransition(s, "takeover") || s === "closed", `takeover from ${s}`);
    assert(isAllowedTransition(s, "closed") || s === "closed", `closed from ${s}`);
  }
});

Deno.test("isAllowedTransition — disallows weird jumps", () => {
  assert(!isAllowedTransition("takeover", "booking_in_progress"));
  assert(!isAllowedTransition("closed", "awaiting_payment_proof"));
  assert(!isAllowedTransition("idle", "awaiting_payment_approval"));
});

Deno.test("getState — defaults to idle", () => {
  assertEquals(getState(null), "idle");
  assertEquals(getState({}), "idle");
  assertEquals(getState({ conversation_state: "foo" }), "idle");
  assertEquals(getState({ conversation_state: "takeover" }), "takeover");
});