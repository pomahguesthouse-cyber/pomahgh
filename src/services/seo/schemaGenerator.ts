export function generateLocalBusinessSchema(
  area: string,
  faq: any[],
) {
  return {
    "@context": "https://schema.org",

    "@graph": [
      {
        "@type": "LodgingBusiness",

        name: "Pomah Guesthouse",

        address: {
          "@type": "PostalAddress",
          addressLocality: "Semarang",
        },

        areaServed: area,

        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4.9",
          reviewCount: "120",
        },
      },

      {
        "@type": "FAQPage",

        mainEntity: faq.map((f) => ({
          "@type": "Question",
          name: f.question,

          acceptedAnswer: {
            "@type": "Answer",
            text: f.answer,
          },
        })),
      },
    ],
  };
}