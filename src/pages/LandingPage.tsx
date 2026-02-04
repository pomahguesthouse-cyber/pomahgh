import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { MessageCircle, Phone, MapPin, Star, CheckCircle } from "lucide-react";
import { OptimizedImage } from "@/components/ui/optimized-image";
import Markdown from "react-markdown";
import NotFound from "./NotFound";
import { LandingPageHeroSlider, HeroSlide } from "@/components/landing/LandingPageHeroSlider";

interface LandingPageData {
  id: string;
  page_title: string;
  slug: string;
  meta_description: string | null;
  primary_keyword: string;
  secondary_keywords: string[];
  hero_headline: string;
  subheadline: string | null;
  page_content: string | null;
  cta_text: string | null;
  whatsapp_number: string | null;
  whatsapp_message_template: string | null;
  hero_image_url: string | null;
  hero_image_alt: string | null;
  og_image_url: string | null;
  hero_slides: HeroSlide[] | null;
  status: string;
}

export default function LandingPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: page, isLoading, error } = useQuery({
    queryKey: ["landing-page", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landing_pages")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .single();

      if (error) throw error;
      
      // Parse hero_slides from JSON
      const heroSlides = Array.isArray(data.hero_slides) 
        ? (data.hero_slides as unknown as HeroSlide[])
        : [];
      
      return {
        ...data,
        hero_slides: heroSlides,
      } as LandingPageData;
    },
    enabled: !!slug,
  });

  const { data: hotelSettings } = useQuery({
    queryKey: ["hotel-settings-landing"],
    queryFn: async () => {
      const { data } = await supabase
        .from("hotel_settings")
        .select("hotel_name, whatsapp_number, address, logo_url")
        .single();
      return data;
    },
  });

  interface RoomPreview {
    id: string;
    name: string;
    slug: string;
    price_per_night: number | null;
    image_url: string | null;
  }
  
  const { data: rooms } = useQuery<RoomPreview[]>({
    queryKey: ["rooms-for-landing"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const query = supabase.from("rooms").select("id, name, slug, price_per_night, image_url") as any;
      const { data } = await query.eq("is_active", true).order("display_order").limit(3);
      return (data as RoomPreview[]) || [];
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !page) {
    return <NotFound />;
  }

  const whatsappNumber = page.whatsapp_number || hotelSettings?.whatsapp_number || "";
  const whatsappMessage = page.whatsapp_message_template
    ? page.whatsapp_message_template.replace("{page_title}", page.page_title)
    : `Halo, saya tertarik booking kamar. Saya menemukan info dari halaman ${page.page_title}.`;

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

  // Build hero slides: use hero_slides array, fallback to single hero_image_url
  const heroSlides: HeroSlide[] = page.hero_slides && page.hero_slides.length > 0
    ? page.hero_slides
    : page.hero_image_url
      ? [{ id: 'legacy', image_url: page.hero_image_url, alt_text: page.hero_image_alt || page.hero_headline }]
      : [];

  const schemaData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LodgingBusiness",
        "@id": `${window.location.origin}/#lodgingbusiness`,
        name: hotelSettings?.hotel_name || "Pomah Guesthouse",
        url: window.location.origin,
        address: {
          "@type": "PostalAddress",
          streetAddress: hotelSettings?.address,
          addressLocality: "Semarang",
          addressRegion: "Jawa Tengah",
          addressCountry: "ID",
        },
        telephone: whatsappNumber,
      },
      {
        "@type": "WebPage",
        "@id": window.location.href,
        url: window.location.href,
        name: page.page_title,
        description: page.meta_description,
        isPartOf: {
          "@id": `${window.location.origin}/#website`,
        },
        about: {
          "@id": `${window.location.origin}/#lodgingbusiness`,
        },
        primaryImageOfPage: page.hero_image_url || page.og_image_url,
        keywords: [page.primary_keyword, ...page.secondary_keywords].join(", "),
      },
      {
        "@type": "LocalBusiness",
        "@id": `${window.location.origin}/#localbusiness`,
        name: hotelSettings?.hotel_name || "Pomah Guesthouse",
        priceRange: "$$",
        address: {
          "@type": "PostalAddress",
          streetAddress: hotelSettings?.address,
          addressLocality: "Semarang",
          addressRegion: "Jawa Tengah",
          addressCountry: "ID",
        },
      },
    ],
  };

  return (
    <>
      <Helmet>
        <title>{page.page_title}</title>
        <meta name="description" content={page.meta_description || ""} />
        <meta name="keywords" content={[page.primary_keyword, ...page.secondary_keywords].join(", ")} />
        <link rel="canonical" href={window.location.href} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={page.page_title} />
        <meta property="og:description" content={page.meta_description || ""} />
        <meta property="og:url" content={window.location.href} />
        {(page.og_image_url || page.hero_image_url) && (
          <meta property="og:image" content={page.og_image_url || page.hero_image_url || ""} />
        )}

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={page.page_title} />
        <meta name="twitter:description" content={page.meta_description || ""} />
        {(page.og_image_url || page.hero_image_url) && (
          <meta name="twitter:image" content={page.og_image_url || page.hero_image_url || ""} />
        )}

        <script type="application/ld+json">{JSON.stringify(schemaData)}</script>
      </Helmet>

      <Header />

      <main className="min-h-screen">
        {/* Hero Section with Slider */}
        <LandingPageHeroSlider
          slides={heroSlides}
          headline={page.hero_headline}
          subheadline={page.subheadline}
          ctaButton={
            <Button
              size="lg"
              className="gap-2 text-lg px-8 py-6"
              asChild
            >
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-5 w-5" />
                {page.cta_text || "Booking via WhatsApp"}
              </a>
            </Button>
          }
        />

        {/* Features Quick Info */}
        <section className="py-8 bg-muted/50 border-y">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap justify-center gap-6 md:gap-12">
              <div className="flex items-center gap-2 text-sm md:text-base">
                <MapPin className="h-5 w-5 text-primary" />
                <span>Dekat Undip Tembalang</span>
              </div>
              <div className="flex items-center gap-2 text-sm md:text-base">
                <Star className="h-5 w-5 text-primary" />
                <span>Rating 4.8/5</span>
              </div>
              <div className="flex items-center gap-2 text-sm md:text-base">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span>Parkir Luas</span>
              </div>
              <div className="flex items-center gap-2 text-sm md:text-base">
                <Phone className="h-5 w-5 text-primary" />
                <span>Respon Cepat</span>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        {page.page_content && (
          <section className="py-12 md:py-16">
            <div className="container mx-auto px-4">
              <article className="prose prose-lg max-w-4xl mx-auto prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-a:text-primary">
                <Markdown>{page.page_content}</Markdown>
              </article>
            </div>
          </section>
        )}

        {/* Mid CTA */}
        <section className="py-12 bg-primary/5">
          <div className="container mx-auto px-4 text-center">
            <h3 className="text-2xl font-bold mb-4">Tertarik Menginap?</h3>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Hubungi kami langsung via WhatsApp untuk booking cepat dan konfirmasi instan
            </p>
            <Button size="lg" className="gap-2" asChild>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-5 w-5" />
                Chat Sekarang
              </a>
            </Button>
          </div>
        </section>

        {/* Rooms Preview */}
        {rooms && rooms.length > 0 && (
          <section className="py-12 md:py-16">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
                Pilihan Kamar Kami
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {rooms.map((room) => (
                  <a
                    key={room.id}
                    href={`/rooms/${room.slug}`}
                    className="group block rounded-xl overflow-hidden border bg-card hover:shadow-lg transition-shadow"
                  >
                    {room.image_url && (
                      <div className="aspect-video overflow-hidden">
                        <OptimizedImage
                          src={room.image_url}
                          alt={room.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          context="room"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2">{room.name}</h3>
                      <p className="text-primary font-bold">
                        Rp {room.price_per_night?.toLocaleString("id-ID")}
                        <span className="text-sm font-normal text-muted-foreground">/malam</span>
                      </p>
                    </div>
                  </a>
                ))}
              </div>
              <div className="text-center mt-8">
                <Button variant="outline" asChild>
                  <a href="/#rooms">Lihat Semua Kamar</a>
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Siap Booking Sekarang?
            </h2>
            <p className="mb-8 max-w-xl mx-auto opacity-90">
              Dapatkan harga terbaik dengan booking langsung via WhatsApp. Tim kami siap membantu 24 jam.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="gap-2 text-lg"
              asChild
            >
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-5 w-5" />
                {page.cta_text || "Booking via WhatsApp"}
              </a>
            </Button>
          </div>
        </section>
      </main>

      <Footer />

      {/* Sticky WhatsApp Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-primary hover:bg-primary/90 text-primary-foreground p-4 rounded-full shadow-lg transition-all hover:scale-110"
        aria-label="Chat via WhatsApp"
      >
        <MessageCircle className="h-6 w-6" />
      </a>
    </>
  );
}
