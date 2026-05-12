export function generateFAQ(area: string) {
  return [
    {
      question: `Apakah Pomah Guesthouse dekat ${area}?`,
      answer: `Ya, Pomah Guesthouse memiliki akses strategis ke area ${area} Semarang.`,
    },

    {
      question: "Apakah tersedia parkir?",
      answer: "Tersedia area parkir untuk tamu.",
    },

    {
      question: "Apakah cocok untuk keluarga?",
      answer: "Ya, cocok untuk keluarga maupun perjalanan bisnis.",
    },
  ];
}