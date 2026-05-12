import { Helmet } from "react-helmet-async";

import { useParams, Link } from "react-router-dom";

import { generateSeoPage } from "@/services/seo/seoPageGenerator";

import { getRelatedAreas } from "@/services/seo/internalLinkAgent";

export default function AreaLandingPage() {
  const { slug } = useParams();

  const area =
    slug?.replace(/-/g, " ") || "Semarang";

  const seo = generateSeoPage(area);

  const related = getRelatedAreas(slug || "");

  return (
    <>
      <Helmet>
        <title>{seo.title}</title>

        <meta
          name="description"
          content={seo.description}
        />

        <script type="application/ld+json">
          {JSON.stringify(seo.schema)}
        </script>
      </Helmet>

      <main className="container mx-auto py-10 px-4">
        <h1 className="text-4xl font-bold">
          {seo.title}
        </h1>

        <p className="mt-4">
          {seo.description}
        </p>

        {/* FAQ */}
        <section className="mt-10">
          <h2 className="text-2xl font-bold">
            FAQ
          </h2>

          <div className="space-y-4 mt-4">
            {seo.faq.map((item, index) => (
              <div key={index}>
                <h3 className="font-semibold">
                  {item.question}
                </h3>

                <p>{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Related Areas */}
        <section className="mt-10">
          <h2 className="text-2xl font-bold">
            Area Terkait
          </h2>

          <div className="flex gap-3 flex-wrap mt-4">
            {related.map((r) => (
              <Link
                key={r.slug}
                to={`/location/${r.slug}`}
                className="underline"
              >
                {r.area}
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}