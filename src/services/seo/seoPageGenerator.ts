import { generateKeywords } from "./keywordAgent";
import { generateFAQ } from "./faqGenerator";
import { generateLocalBusinessSchema } from "./schemaGenerator";

export function generateSeoPage(area: string) {
  const keywords = generateKeywords(area);

  const faq = generateFAQ(area);

  const schema =
    generateLocalBusinessSchema(area, faq);

  return {
    title:
      `Penginapan dekat ${area} Semarang | Pomah Guesthouse`,

    description:
      `Pomah Guesthouse menyediakan penginapan nyaman dekat ${area} Semarang untuk keluarga dan perjalanan bisnis.`,

    keywords,

    faq,

    schema,
  };
}