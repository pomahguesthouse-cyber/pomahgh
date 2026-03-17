import { describe, it, expectTypeOf } from "vitest";
import type { ChatMessage, ConversationContext, TrainingPair } from "./types";

describe("chatbot types", () => {
  it("ChatMessage shape is stable", () => {
    expectTypeOf<ChatMessage>().toMatchTypeOf<{
      role: "user" | "assistant";
      content: string;
      timestamp: Date;
    }>();
  });

  it("ConversationContext shape is stable", () => {
    expectTypeOf<ConversationContext>().toMatchTypeOf<{
      guest_name: string | null;
      preferred_room: string | null;
      check_in_date: string | null;
      check_out_date: string | null;
      guest_count: number | null;
      phone_number: string | null;
      email: string | null;
    }>();
  });

  it("TrainingPair shape is stable", () => {
    expectTypeOf<TrainingPair>().toMatchTypeOf<{ question: string; answer: string }>();
  });
});
