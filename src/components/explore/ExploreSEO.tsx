import { Helmet } from "react-helmet-async";
import { useSeoSettings } from "@/hooks/useSeoSettings";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { CityAttraction } from "@/hooks/useCityAttractions";

interface ExploreSEOProps {
  attractions: CityAttraction[];
}

export const ExploreSEO = ({ attractions }: ExploreSEOProps) => {
  const { settings } = useSeoSettings();
  const { settings: hotelSettings } = useHotelSettings();
  
  const baseUrl = settings?.canonical_url || "https://pomahguesthouse.com";
  const pageTitle = "Explore Semarang - Wisata, Kuliner & Destinasi Terbaik | " + (settings?.site_title || "Pomah Guesthouse");
  const description = "Temukan destinasi wisata terbaik di Semarang: Lawang Sewu, Sam Poo Kong, kuliner Lunpia, dan tempat menarik lainnya. Menginap nyaman di Pomah Guesthouse.";
  const keywords = "wisata semarang, tempat wisata semarang, kuliner semarang, hotel semarang, penginapan semarang, lawang sewu, sam poo kong, kota lama semarang";

  const touristDestinationSchema = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    "name": "Semarang",
    "description": "Kota Semarang adalah ibukota Jawa Tengah yang kaya akan sejarah, budaya, dan kuliner. Dikenal dengan julukan 'Little Netherlands' karena bangunan kolonial yang masih terjaga.",
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": hotelSettings?.latitude || -6.9666,
      "longitude": hotelSettings?.longitude || 110.4196
    },
    "touristType": ["Cultural tourist", "Food tourist", "History tourist"]
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Destinasi Wisata Semarang",
    "numberOfItems": attractions.length,
    "itemListElement": attractions.map((attraction, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "TouristAttraction",
        "name": attraction.name,
        "description": attraction.description,
        "url": `${baseUrl}/explore-semarang/${attraction.slug}`,
        ...(attraction.image_url && { "image": attraction.image_url })
      }
    }))
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": baseUrl
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Explore Semarang",
        "item": `${baseUrl}/explore-semarang`
      }
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Apa saja tempat wisata populer di Semarang?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Tempat wisata populer di Semarang antara lain Lawang Sewu, Sam Poo Kong, Kota Lama Semarang, Museum Ronggowarsito, Pantai Marina, dan Brown Canyon."
        }
      },
      {
        "@type": "Question",
        "name": "Kuliner khas Semarang apa yang wajib dicoba?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Kuliner khas Semarang yang wajib dicoba adalah Lumpia Semarang (Gang Lombok), Tahu Gimbal, Bandeng Presto, dan Wingko Babat."
        }
      },
      {
        "@type": "Question",
        "name": "Berapa jarak dari Pomah Guesthouse ke Lawang Sewu?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Jarak dari Pomah Guesthouse ke Lawang Sewu sekitar 3.5 km dengan waktu tempuh sekitar 15 menit menggunakan kendaraan."
        }
      }
    ]
  };

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={`${baseUrl}/explore-semarang`} />
      
      {/* Open Graph */}
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="article" />
      <meta property="og:url" content={`${baseUrl}/explore-semarang`} />
      {settings?.default_og_image && <meta property="og:image" content={settings.default_og_image} />}
      <meta property="og:locale" content="id_ID" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      
      {/* Structured Data */}
      <script type="application/ld+json">{JSON.stringify(touristDestinationSchema)}</script>
      <script type="application/ld+json">{JSON.stringify(itemListSchema)}</script>
      <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
    </Helmet>
  );
};
