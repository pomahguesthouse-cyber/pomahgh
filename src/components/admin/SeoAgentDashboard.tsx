import { calculateSeoScore } from "@/services/seo/seoScoreAgent";

export function SeoAgentDashboard() {
  const score = calculateSeoScore({
    title:
      "Penginapan dekat Simpang Lima Semarang",
    description:
      "Pomah Guesthouse menyediakan penginapan nyaman dekat pusat kota Semarang.",
    hasSchema: true,
    hasFaq: true,
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">
        SEO Agent Dashboard
      </h2>

      <div className="p-6 rounded border">
        <p className="text-lg">
          SEO Score:
        </p>

        <p className="text-4xl font-bold">
          {score}/100
        </p>
      </div>
    </div>
  );
}