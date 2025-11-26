import { Helmet } from "react-helmet-async";
import type { RoomSEOProps } from "./types";
import { useSeoSettings } from "@/hooks/useSeoSettings";

export const RoomSEO = ({ room, images, displayPrice, roomSlug }: RoomSEOProps) => {
  const { settings } = useSeoSettings();
  
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    "name": room.name,
    "description": room.description,
    "image": images,
    "priceRange": `Rp ${displayPrice.toLocaleString("id-ID")}`,
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "ID"
    }
  };

  const pageTitle = `${room.name} - ${settings?.og_site_name || 'Pomah Guesthouse'} | Luxury Accommodation in Bali`;
  const canonicalUrl = `${settings?.canonical_url || 'https://pomahguesthouse.com'}/rooms/${roomSlug}`;

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={room.description} />
      
      {/* Open Graph */}
      <meta property="og:type" content="hotel" />
      <meta property="og:title" content={`${room.name} - ${settings?.og_site_name || 'Pomah Guesthouse'}`} />
      <meta property="og:description" content={room.description} />
      <meta property="og:image" content={images[0]} />
      <meta property="og:url" content={canonicalUrl} />
      {settings?.og_site_name && (
        <meta property="og:site_name" content={settings.og_site_name} />
      )}
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={`${room.name} - ${settings?.og_site_name || 'Pomah Guesthouse'}`} />
      <meta name="twitter:description" content={room.description} />
      <meta name="twitter:image" content={images[0]} />
      {settings?.twitter_handle && (
        <meta name="twitter:site" content={`@${settings.twitter_handle}`} />
      )}
      
      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Schema.org structured data */}
      {settings?.structured_data_enabled && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};
