import { describe, it, expect } from "vitest";
import { detectIntent, getToolGuidanceHint } from "./intentDetector";

describe("intentDetector", () => {
  it("detects room price intent with high confidence", () => {
    const result = detectIntent("berapa harga kamar deluxe untuk malam ini?");

    expect(result.intent).toBe("room_prices");
    expect(result.confidence).toBe("high");
    expect(result.suggestedTool).toBe("get_room_prices");
  });

  it("detects calendar intent", () => {
    const result = detectIntent("tolong kirim link kalender booking");

    expect(result.intent).toBe("calendar_link");
    expect(result.suggestedTool).toBe("send_calendar_link");
  });

  it("falls back to general intent when no pattern matches", () => {
    const result = detectIntent("halo apa kabar");

    expect(result.intent).toBe("general");
    expect(result.confidence).toBe("low");
  });
});

describe("getToolGuidanceHint", () => {
  it("returns empty hint for low-confidence/general intent", () => {
    const hint = getToolGuidanceHint({ intent: "general", confidence: "low" });
    expect(hint).toBe("");
  });

  it("returns hint string with detected tool", () => {
    const hint = getToolGuidanceHint({
      intent: "room_prices",
      confidence: "high",
      suggestedTool: "get_room_prices",
      extractedParams: { room_name: "Deluxe" },
    });

    expect(hint).toContain("get_room_prices");
    expect(hint).toContain('room_name="Deluxe"');
  });
});
