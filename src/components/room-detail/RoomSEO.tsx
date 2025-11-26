import { Helmet } from "react-helmet-async";
import type { RoomSEOProps } from "./types";

export const RoomSEO = ({ room, images, displayPrice, roomSlug }: RoomSEOProps) => {
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

  return (
    <Helmet>
      <title>{room.name} - Pomah Guesthouse | Luxury Accommodation in Bali</title>
      <meta name="description" content={room.description} />
      
      {/* Open Graph */}
      <meta property="og:type" content="hotel" />
      <meta property="og:title" content={`${room.name} - Pomah Guesthouse`} />
      <meta property="og:description" content={room.description} />
      <meta property="og:image" content={images[0]} />
      <meta property="og:url" content={`https://pomahguesthouse.com/rooms/${roomSlug}`} />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={`${room.name} - Pomah Guesthouse`} />
      <meta name="twitter:description" content={room.description} />
      <meta name="twitter:image" content={images[0]} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={`https://pomahguesthouse.com/rooms/${roomSlug}`} />
      
      {/* Schema.org structured data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
};
