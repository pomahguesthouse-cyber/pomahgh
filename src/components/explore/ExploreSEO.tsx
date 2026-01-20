import { Helmet } from "react-helmet-async";
import { useSeoSettings } from "@/hooks/useSeoSettings";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { CityAttraction } from "@/hooks/useCityAttractions";

interface ExploreSEOProps {
  attractions: CityAttraction[];
}

const getCategoryTouristType = (category: string): string[] => {
  const typeMap: Record<string, string[]> = {
    "Wisata": ["Cultural tourist", "History tourist", "Sightseeing tourist"],
    "Kuliner": ["Food tourist", "Culinary tourist"],
    "Belanja": ["Shopping tourist"],
    "Alam": ["Nature tourist", "Eco tourist", "Adventure tourist"],
  };
  return typeMap[category] || ["Tourist"];
};

export const ExploreSEO = ({ attractions }: ExploreSEOProps) => {
  const { settings } = useSeoSettings();
  const { settings: hotelSettings } = useHotelSettings();
  
  const baseUrl = settings?.canonical_url || "https://pomahguesthouse.com";
  const pageTitle = "Explore Semarang - Wisata, Kuliner & Destinasi Terbaik | " + (settings?.site_title || "Pomah Guesthouse");
  const description = "Temukan destinasi wisata terbaik di Semarang: Lawang Sewu, Sam Poo Kong, kuliner Lunpia, dan tempat menarik lainnya. Menginap nyaman di Pomah Guesthouse.";
  const keywords = "wisata semarang, tempat wisata semarang, kuliner semarang, hotel semarang, penginapan semarang, lawang sewu, sam poo kong, kota lama semarang";
  const ogImage = settings?.default_og_image || `${baseUrl}/og-explore-semarang.jpg`;

  // LodgingBusiness Schema - Connect hotel with explore page
  const lodgingBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "name": hotelSettings?.hotel_name || "Pomah Guesthouse",
    "description": hotelSettings?.description || "Penginapan nyaman di pusat Kota Semarang",
    "url": baseUrl,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": hotelSettings?.address,
      "addressLocality": hotelSettings?.city || "Semarang",
      "addressRegion": hotelSettings?.state || "Jawa Tengah",
      "postalCode": hotelSettings?.postal_code,
      "addressCountry": hotelSettings?.country || "ID"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": hotelSettings?.latitude || -6.9666,
      "longitude": hotelSettings?.longitude || 110.4196
    },
    "telephone": hotelSettings?.phone_primary,
    "email": hotelSettings?.email_primary,
    "image": hotelSettings?.logo_url,
    "priceRange": settings?.price_range || "$$",
    "amenityFeature": [
      { "@type": "LocationFeatureSpecification", "name": "Free WiFi", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Parking", "value": true }
    ]
  };

  // TouristDestination Schema with enhanced details
  const touristDestinationSchema = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    "name": "Semarang, Jawa Tengah",
    "description": "Kota Semarang adalah ibukota Jawa Tengah yang kaya akan sejarah, budaya, dan kuliner. Dikenal dengan julukan 'Little Netherlands' karena bangunan kolonial yang masih terjaga.",
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": hotelSettings?.latitude || -6.9666,
      "longitude": hotelSettings?.longitude || 110.4196
    },
    "touristType": ["Cultural tourist", "Food tourist", "History tourist"],
    "includesAttraction": attractions.filter(a => a.is_active).slice(0, 10).map(attraction => ({
      "@type": "TouristAttraction",
      "name": attraction.name,
      "description": attraction.description,
      "url": `${baseUrl}/explore-semarang/${attraction.slug}`
    }))
  };

  // CollectionPage Schema
  const collectionPageSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": pageTitle,
    "description": description,
    "url": `${baseUrl}/explore-semarang`,
    "inLanguage": "id-ID",
    "isPartOf": {
      "@type": "WebSite",
      "name": settings?.og_site_name || "Pomah Guesthouse",
      "url": baseUrl
    },
    "about": {
      "@type": "Place",
      "name": "Semarang",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Semarang",
        "addressRegion": "Jawa Tengah",
        "addressCountry": "ID"
      }
    }
  };

  // Enhanced ItemList Schema with full TouristAttraction details
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Destinasi Wisata Semarang",
    "description": "Daftar lengkap tempat wisata, kuliner, dan destinasi menarik di Semarang",
    "numberOfItems": attractions.filter(a => a.is_active).length,
    "itemListElement": attractions.filter(a => a.is_active).map((attraction, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "TouristAttraction",
        "name": attraction.name,
        "description": attraction.description,
        "url": `${baseUrl}/explore-semarang/${attraction.slug}`,
        ...(attraction.image_url && { "image": attraction.image_url }),
        ...(attraction.address && { 
          "address": {
            "@type": "PostalAddress",
            "streetAddress": attraction.address,
            "addressLocality": "Semarang",
            "addressRegion": "Jawa Tengah",
            "addressCountry": "ID"
          }
        }),
        ...(attraction.latitude && attraction.longitude && {
          "geo": {
            "@type": "GeoCoordinates",
            "latitude": attraction.latitude,
            "longitude": attraction.longitude
          }
        }),
        "isAccessibleForFree": attraction.price_range === "Gratis",
        "publicAccess": true,
        "touristType": getCategoryTouristType(attraction.category)
      }
    }))
  };

  // Breadcrumb Schema
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

  // Dynamic FAQ Schema - Static + Featured Attractions
  const staticFAQs = [
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
    }
  ];

  // Generate dynamic FAQs from featured attractions
  const dynamicFAQs = attractions
    .filter(a => a.is_featured && a.is_active && a.distance_km && a.travel_time_minutes)
    .slice(0, 5)
    .map(attraction => ({
      "@type": "Question",
      "name": `Berapa jarak ${attraction.name} dari Pomah Guesthouse?`,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": `Jarak ${attraction.name} dari Pomah Guesthouse sekitar ${attraction.distance_km} km dengan waktu tempuh sekitar ${attraction.travel_time_minutes} menit menggunakan kendaraan.${attraction.best_time_to_visit ? ` Waktu terbaik untuk berkunjung: ${attraction.best_time_to_visit}.` : ''}`
      }
    }));

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [...staticFAQs, ...dynamicFAQs]
  };

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={hotelSettings?.hotel_name || "Pomah Guesthouse"} />
      <link rel="canonical" href={`${baseUrl}/explore-semarang`} />
      
      {/* Robots */}
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      
      {/* Geo Tags for Local SEO */}
      <meta name="geo.region" content="ID-JT" />
      <meta name="geo.placename" content="Semarang, Jawa Tengah" />
      <meta name="geo.position" content={`${hotelSettings?.latitude || -6.9666};${hotelSettings?.longitude || 110.4196}`} />
      <meta name="ICBM" content={`${hotelSettings?.latitude || -6.9666}, ${hotelSettings?.longitude || 110.4196}`} />
      
      {/* Open Graph */}
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="article" />
      <meta property="og:url" content={`${baseUrl}/explore-semarang`} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="Wisata Semarang - Lawang Sewu, Sam Poo Kong, dan destinasi populer lainnya" />
      <meta property="og:locale" content="id_ID" />
      <meta property="og:site_name" content={settings?.og_site_name || "Pomah Guesthouse"} />
      
      {/* Article Meta */}
      <meta property="article:author" content={hotelSettings?.hotel_name || "Pomah Guesthouse"} />
      <meta property="article:section" content="Travel & Tourism" />
      <meta property="article:tag" content="wisata semarang" />
      <meta property="article:tag" content="kuliner semarang" />
      <meta property="article:tag" content="tempat wisata" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      {settings?.twitter_handle && <meta name="twitter:site" content={settings.twitter_handle} />}
      
      {/* Hreflang for Indonesian */}
      <link rel="alternate" hrefLang="id" href={`${baseUrl}/explore-semarang`} />
      <link rel="alternate" hrefLang="x-default" href={`${baseUrl}/explore-semarang`} />
      
      {/* Structured Data */}
      <script type="application/ld+json">{JSON.stringify(lodgingBusinessSchema)}</script>
      <script type="application/ld+json">{JSON.stringify(touristDestinationSchema)}</script>
      <script type="application/ld+json">{JSON.stringify(collectionPageSchema)}</script>
      <script type="application/ld+json">{JSON.stringify(itemListSchema)}</script>
      <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
    </Helmet>
  );
};
