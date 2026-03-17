import { describe, it, expect } from "vitest";
import {
  extractTrainingPairs,
  pickBestTrainingPairs,
  buildAutoTrainingInserts,
} from "./trainingExampleSelector";

describe("trainingExampleSelector", () => {
  it("extracts user-assistant Q&A pairs only", () => {
    const pairs = extractTrainingPairs([
      { role: "user", content: "Halo" },
      { role: "assistant", content: "Halo, ada yang bisa saya bantu?" },
      { role: "assistant", content: "Pesan lanjutan" },
      { role: "user", content: "Harga kamar deluxe berapa untuk akhir pekan ini?" },
      { role: "assistant", content: "Harga kamar deluxe mulai dari Rp500.000, tergantung tanggal dan ketersediaan." },
    ]);

    expect(pairs).toHaveLength(1);
    expect(pairs[0].question).toContain("Harga kamar deluxe");
  });

  it("prioritizes booking-related answers", () => {
    const selected = pickBestTrainingPairs([
      { question: "Q1", answer: "Ini jawaban umum tentang fasilitas." },
      { question: "Q2", answer: "Untuk booking kamar, cek harga dan ketersediaan tanggal check in." },
      { question: "Q3", answer: "Info lain." },
    ], 1);

    expect(selected).toHaveLength(1);
    expect(selected[0].question).toBe("Q2");
  });

  it("respects selection limit", () => {
    const selected = pickBestTrainingPairs([
      { question: "Q1", answer: "A1 booking" },
      { question: "Q2", answer: "A2 reservasi" },
      { question: "Q3", answer: "A3 kamar" },
    ], 2);

    expect(selected).toHaveLength(2);
  });

  it("builds normalized auto-training payloads", () => {
    const inserts = buildAutoTrainingInserts([
      { role: "user", content: "Saya mau booking kamar deluxe untuk 2 orang weekend ini." },
      {
        role: "assistant",
        content:
          "Baik, untuk booking kamar deluxe weekend ini saya bantu cek harga dan ketersediaan terlebih dahulu.",
      },
    ]);

    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({
      category: "auto-generated",
      is_active: true,
      display_order: 999,
    });
    expect(inserts[0].question).toContain("booking kamar deluxe");
  });
});
