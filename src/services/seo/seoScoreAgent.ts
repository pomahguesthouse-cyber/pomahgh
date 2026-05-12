export function calculateSeoScore(data: {
  title: string;
  description: string;
  hasSchema: boolean;
  hasFaq: boolean;
}) {
  let score = 0;

  if (
    data.title.length >= 30 &&
    data.title.length <= 60
  ) {
    score += 25;
  }

  if (
    data.description.length >= 120 &&
    data.description.length <= 160
  ) {
    score += 25;
  }

  if (data.hasSchema) {
    score += 25;
  }

  if (data.hasFaq) {
    score += 25;
  }

  return score;
}