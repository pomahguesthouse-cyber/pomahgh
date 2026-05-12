import { Helmet } from "react-helmet-async";
import { useParams } from "react-router-dom";
import { semarangAreas } from "@/data/semarangAreas";

export default function AreaLandingPage() {
  const { slug } = useParams();

  const areaData = semarangAreas.find(
    (item) => item.slug === slug
  );

  if (!areaData) {
    return <div>Page not found</div>;
  }

  const canonical =
    window.location.origin + "/location/" + areaData.slug;

  const schema = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: "Pomah Guesthouse",
    areaServed: areaData.area,
    description: areaData.description,
    url: canonical,
  };

  return (
    <>
      <Helmet>
        <title>{areaData.title}</title>

        <meta
          name="description"
          content={areaData.description}
        />

        <link rel="canonical" href={canonical} />

        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      </Helmet>

      <main className="container mx-auto py-10">
        <h1>{areaData.title}</h1>

        <p>{areaData.description}</p>

        <section>
          <h2>
            Penginapan Strategis di {areaData.area}
          </h2>

          <p>
            Pomah Guesthouse cocok untuk wisata,
            perjalanan bisnis, maupun staycation
            keluarga di area {areaData.area}.
          </p>
        </section>
      </main>
    </>
  );
}