import { describe, it, expect } from "vitest";
import { DEFAULT_CONTEXT, extractConversationContext } from "./contextExtractor";

describe("contextExtractor", () => {
  it("extracts preferred room and guest count", () => {
    const result = extractConversationContext(
      "Saya mau kamar Deluxe untuk 3 orang",
      DEFAULT_CONTEXT,
    );

    expect(result.preferred_room).toBe("Deluxe");
    expect(result.guest_count).toBe(3);
  });

  it("extracts Indonesian date pair", () => {
    const result = extractConversationContext(
      "Check in 12 Januari 2027 dan check out 14 Januari 2027",
      DEFAULT_CONTEXT,
    );

    expect(result.check_in_date).toContain("12 Januari");
    expect(result.check_out_date).toContain("14 Januari");
  });

  it("keeps existing values when no new info found", () => {
    const seeded = {
      ...DEFAULT_CONTEXT,
      guest_name: "Budi",
      preferred_room: "Villa",
    };

    const result = extractConversationContext("Terima kasih infonya", seeded);

    expect(result.guest_name).toBe("Budi");
    expect(result.preferred_room).toBe("Villa");
  });

  it("extracts guest name from booking phrase", () => {
    const result = extractConversationContext(
      "Booking atas nama Andi Pratama untuk besok",
      DEFAULT_CONTEXT,
    );

    expect(result.guest_name).toBe("Andi Pratama");
  });
});
