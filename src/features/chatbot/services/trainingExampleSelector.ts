import type { TrainingPair } from "../types";

const BOOKING_KEYWORDS = [
  "booking",
  "reservasi",
  "kamar",
  "check in",
  "check-out",
  "harga",
  "tersedia",
];

export function extractTrainingPairs(
  messages: Array<{ role: string; content: string }>,
): TrainingPair[] {
  const pairs: TrainingPair[] = [];

  for (let i = 1; i < messages.length; i++) {
    if (messages[i].role === "assistant" && messages[i - 1].role === "user") {
      const question = messages[i - 1].content.trim();
      const answer = messages[i].content.trim();
      if (question.length > 10 && answer.length > 20) {
        pairs.push({ question, answer });
      }
    }
  }

  return pairs;
}

export function pickBestTrainingPairs(pairs: TrainingPair[], limit = 3): TrainingPair[] {
  const prioritized = [...pairs].sort((a, b) => {
    const aScore = BOOKING_KEYWORDS.some((k) => a.answer.toLowerCase().includes(k)) ? 1 : 0;
    const bScore = BOOKING_KEYWORDS.some((k) => b.answer.toLowerCase().includes(k)) ? 1 : 0;
    return bScore - aScore;
  });

  return prioritized.slice(0, limit);
}
