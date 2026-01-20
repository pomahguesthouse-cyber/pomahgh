import { Helmet } from "react-helmet-async";
import type { RoomSEOProps } from "./types";
import { useSeoSettings } from "@/hooks/useSeoSettings";

export const RoomSEO = ({ room, images, displayPrice, roomSlug }: RoomSEOProps) => {
  const { settings } = useSeoSettings();

  const safeDescription =
    room.description?.substring(0, 155) || `Discover ${room.name} at ${settings?.og_site_name || "Pomah Guesthouse"}.`;

  const mainImage = images?.length > 0 ? images[0] : `${settings?.canonical_url}/default-room.jpg`;

  const canonicalUrl = `${settings?.canonical_url || "https://pomahguesthouse.com"}/rooms/${roomSlug}`;

  /** ----------------------
   * JSON-LD structured data
   * Using Product + Offers (best for Room SEO)
   ------------------------- */
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: room.name,
    description: safeDescription,
    image: images,
    brand: {
      "@type": "Brand",
      name: settings?.og_site_name || "Pomah Guesthouse",
    },
    offers: {
      "@type": "Offer",
      url: canonicalUrl,
      priceCurrency: "IDR",
      price: displayPrice,
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  const pageTitle = `${room.name} – ${settings?.og_site_name || "Pomah Guesthouse"} | Luxury Accommodation in Bali`;

  return (
    <Helmet>
      {/* Title */}
      <title>{pageTitle}</title>
      <meta name="description" content={safeDescription} />

      {/* Canonical */}
      <link rel="canonical" href={canonicalUrl} />

      {/* --- Open Graph --- */}
      <meta property="og:type" content="product" />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={safeDescription} />
      <meta property="og:image" content={mainImage} />
      <meta property="og:url" content={canonicalUrl} />
      {settings?.og_site_name && <meta property="og:site_name" content={settings.og_site_name} />}

      {/* --- Twitter Card --- */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={safeDescription} />
      <meta name="twitter:image" content={mainImage} />
      {settings?.twitter_handle && <meta name="twitter:site" content={`@${settings.twitter_handle}`} />}

      {/* --- JSON-LD (Structured Data) --- */}
      {settings?.structured_data_enabled && (
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      )}
    </Helmet>
  );
};
