import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import Header from "@/components/Header";
import OptimizedHero from "@/components/OptimizedHero";
import DateSearchBar from "@/components/DateSearchBar";
import { Welcome } from "@/components/Welcome";
import { GoogleRating } from "@/components/GoogleRating";
import { Rooms } from "@/components/Rooms";
import { Amenities } from "@/components/Amenities";
import { Location } from "@/components/Location";
import { Footer } from "@/components/Footer";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import { LazySection } from "@/components/LazySection";

const Index = () => {
  const location = useLocation();
  const canonical = `${window.location.origin}`;
  const title = "Pomah Guesthouse - Your Perfect Stay in Semarang";
  const description = "Pomah Guesthouse Dewi Sartika - Alternatif Penginapan Keluarga di Kota Semarang";

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: canonical,
    inLanguage: "id",
  };

  // Handle hash navigation from other pages
  useEffect(() => {
    if (location.hash) {
      const element = document.getElementById(location.hash.replace('#', ''));
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({
            behavior: 'smooth'
          });
        }, 100);
      }
    }
  }, [location.hash]);

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />

        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />

        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />

        <script type="application/ld+json">{JSON.stringify(webPageSchema)}</script>
      </Helmet>
      <Header />
      <main>
        <OptimizedHero />
        <DateSearchBar />
        <Welcome />
        <GoogleRating />
        <LazySection>
          <Rooms />
        </LazySection>
        <LazySection>
          <Amenities />
        </LazySection>
        <LazySection>
          <Location />
        </LazySection>
      </main>
      <Footer />
      {/* Hidden on mobile (already handled by component) */}
      <FloatingWhatsApp />
    </div>
  );
};

export default Index;