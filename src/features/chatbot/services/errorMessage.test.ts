import { describe, it, expect } from "vitest";
import { getChatErrorMessage } from "./errorMessage";

describe("errorMessage", () => {
  it("maps rate-limit errors", () => {
    expect(getChatErrorMessage(new Error("429 too many requests"))).toContain("banyak permintaan");
  });

  it("maps network errors", () => {
    expect(getChatErrorMessage(new Error("Failed to fetch"))).toContain("Koneksi");
  });

  it("returns general fallback for unknown errors", () => {
    expect(getChatErrorMessage(new Error("unexpected"))).toContain("terjadi kesalahan");
  });
});
