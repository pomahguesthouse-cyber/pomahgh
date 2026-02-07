import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
 import { MessageCircle, Phone, MapPin, Star, CheckCircle, Sparkles } from "lucide-react";
import Markdown from "react-markdown";
import NotFound from "./NotFound";
import { LandingPageHeroSlider, HeroSlide } from "@/components/landing/LandingPageHeroSlider";
 import { LandingRoomSlider } from "@/components/landing/LandingRoomSlider";

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

        {/* Rooms Section - Right Below Hero */}
        <section className="py-16 md:py-24 bg-secondary/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
                <Star className="h-4 w-4" />
                Akomodasi Premium
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Pilihan Kamar Kami
              </h2>
              <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
                Nikmati kenyamanan menginap dengan fasilitas lengkap dan pelayanan terbaik
              </p>
            </div>
            <LandingRoomSlider />
          </div>
        </section>

        {/* Main Content */}
        {page.page_content && (
          <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
              <article className="
                prose prose-lg md:prose-xl max-w-4xl mx-auto 
                prose-headings:font-bold prose-headings:text-foreground prose-headings:tracking-tight
                prose-h1:text-3xl prose-h1:md:text-4xl prose-h1:lg:text-5xl prose-h1:mb-6
                prose-h2:text-2xl prose-h2:md:text-3xl prose-h2:mt-12 prose-h2:mb-4
                prose-h3:text-xl prose-h3:md:text-2xl prose-h3:mt-8 prose-h3:mb-3
                prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-6
                prose-strong:text-foreground prose-strong:font-semibold
                prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline
                prose-ul:my-6 prose-ul:space-y-2
                prose-li:text-muted-foreground prose-li:leading-relaxed
                prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-muted/30 prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:rounded-r-lg prose-blockquote:italic prose-blockquote:text-foreground/80
                prose-img:rounded-xl prose-img:shadow-lg
              ">
                <Markdown>{page.page_content}</Markdown>
              </article>
            </div>
          </section>
        )}

        {/* Mid CTA */}
        <section className="py-16 md:py-20 bg-gradient-to-br from-primary/5 via-primary/10 to-transparent">
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              Penawaran Spesial
            </div>
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 tracking-tight">
              Tertarik Menginap?
            </h3>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto leading-relaxed">
              Hubungi kami langsung via WhatsApp untuk booking cepat dan konfirmasi instan
            </p>
            <Button size="lg" className="gap-2 text-base px-8 py-6 shadow-lg hover:shadow-xl transition-all" asChild>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-5 w-5" />
                Chat Sekarang
              </a>
            </Button>
          </div>
        </section>

        {/* Bottom CTA */}
         <section className="py-20 md:py-28 bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground relative overflow-hidden">
           {/* Decorative elements */}
           <div className="absolute inset-0 opacity-10">
             <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
             <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/3 translate-y-1/3" />
           </div>
           
           <div className="container mx-auto px-4 text-center relative z-10">
             <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-6 tracking-tight">
              Siap Booking Sekarang?
            </h2>
             <p className="mb-10 max-w-xl mx-auto opacity-90 text-base md:text-lg leading-relaxed">
              Dapatkan harga terbaik dengan booking langsung via WhatsApp. Tim kami siap membantu 24 jam.
            </p>
            <Button
              size="lg"
              variant="secondary"
               className="gap-2 text-base md:text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all hover:scale-105"
              asChild
            >
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                 <MessageCircle className="h-5 w-5 md:h-6 md:w-6" />
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
         className="fixed bottom-6 right-6 z-50 bg-primary hover:bg-primary/90 text-primary-foreground p-4 rounded-full shadow-xl transition-all hover:scale-110"
        aria-label="Chat via WhatsApp"
      >
         <MessageCircle className="h-5 w-5 md:h-6 md:w-6" />
      </a>
    </>
  );
}
