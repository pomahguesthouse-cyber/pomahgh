import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { MapPin, Clock, ArrowLeft, Lightbulb, Calendar, DollarSign, Share2 } from "lucide-react";
import * as Icons from "lucide-react";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCityAttractions } from "@/hooks/useCityAttractions";
import { useSeoSettings } from "@/hooks/useSeoSettings";
import { AttractionCard } from "@/components/explore/AttractionCard";
import { toast } from "@/hooks/use-toast";

const categoryLabels: Record<string, string> = {
  wisata: "Wisata",
  kuliner: "Kuliner",
  alam: "Alam",
  belanja: "Belanja",
  budaya: "Budaya",
};

const AttractionDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { attractions, isLoading } = useCityAttractions();
  const { settings: seoSettings } = useSeoSettings();
  
  const attraction = attractions.find((a) => a.slug === slug);
  const relatedAttractions = attractions
    .filter((a) => a.category === attraction?.category && a.id !== attraction?.id)
    .slice(0, 3);
  
  const baseUrl = seoSettings?.canonical_url || "https://pomahguesthouse.com";
  
  const defaultImages: Record<string, string> = {
    wisata: "https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=1200&q=80",
    kuliner: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80",
    alam: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
    belanja: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=1200&q=80",
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: attraction?.name,
        text: attraction?.description,
        url: window.location.href,
      });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link disalin", description: "Link berhasil disalin ke clipboard" });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-20">
          <Skeleton className="h-96 rounded-lg mb-8" />
          <Skeleton className="h-8 w-1/2 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!attraction) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Destinasi tidak ditemukan</h1>
          <Link to="/explore-semarang">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke Explore Semarang
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const IconComponent = (Icons as any)[attraction.icon_name] || Icons.MapPin;
  const imageUrl = attraction.image_url || defaultImages[attraction.category] || defaultImages.wisata;

  const attractionSchema = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    "name": attraction.name,
    "description": attraction.description,
    "url": `${baseUrl}/explore-semarang/${attraction.slug}`,
    "image": imageUrl,
    ...(attraction.address && { "address": attraction.address }),
    ...(attraction.latitude && attraction.longitude && {
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": attraction.latitude,
        "longitude": attraction.longitude
      }
    })
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{attraction.name} - Explore Semarang | {seoSettings?.site_title || "Pomah Guesthouse"}</title>
        <meta name="description" content={attraction.description || `Informasi lengkap tentang ${attraction.name} di Semarang`} />
        <link rel="canonical" href={`${baseUrl}/explore-semarang/${attraction.slug}`} />
        <meta property="og:title" content={`${attraction.name} - Wisata Semarang`} />
        <meta property="og:description" content={attraction.description || ""} />
        <meta property="og:image" content={imageUrl} />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">{JSON.stringify(attractionSchema)}</script>
      </Helmet>
      
      <Header />
      
      <main>
        {/* Hero Image */}
        <div className="relative h-[50vh] min-h-[400px]">
          <img
            src={imageUrl}
            alt={attraction.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <div className="max-w-4xl mx-auto">
              <Badge className="mb-4">{categoryLabels[attraction.category]}</Badge>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                {attraction.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-white/80">
                {attraction.distance_km && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {attraction.distance_km} km dari hotel
                  </span>
                )}
                {attraction.travel_time_minutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {attraction.travel_time_minutes} menit perjalanan
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Breadcrumb
            items={[
              { label: "Explore Semarang", href: "/explore-semarang" },
              { label: attraction.name },
            ]}
          />
          
          <div className="flex gap-4 mt-6 mb-8">
            <Link to="/explore-semarang">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Bagikan
            </Button>
          </div>
          
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="prose prose-lg max-w-none"
          >
            <p className="text-xl text-muted-foreground leading-relaxed">
              {attraction.description}
            </p>
            
            {attraction.long_description && (
              <div className="mt-8 text-foreground">
                {attraction.long_description.split('\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            )}
          </motion.div>
          
          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
            {attraction.tips && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <Lightbulb className="h-5 w-5" />
                    <span className="font-semibold">Tips</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{attraction.tips}</p>
                </CardContent>
              </Card>
            )}
            
            {attraction.best_time_to_visit && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <Calendar className="h-5 w-5" />
                    <span className="font-semibold">Waktu Terbaik</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{attraction.best_time_to_visit}</p>
                </CardContent>
              </Card>
            )}
            
            {attraction.price_range && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <DollarSign className="h-5 w-5" />
                    <span className="font-semibold">Kisaran Harga</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{attraction.price_range}</p>
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Address */}
          {attraction.address && (
            <Card className="mt-8">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <IconComponent className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Alamat</h3>
                    <p className="text-muted-foreground">{attraction.address}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* CTA */}
          <Card className="mt-12 bg-primary/5 border-primary/20">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold text-foreground mb-4">
                Tertarik mengunjungi {attraction.name}?
              </h3>
              <p className="text-muted-foreground mb-6">
                Pesan penginapan di Pomah Guesthouse untuk kemudahan akses ke destinasi ini
              </p>
              <Link to="/#rooms">
                <Button size="lg">Lihat Kamar Tersedia</Button>
              </Link>
            </CardContent>
          </Card>
          
          {/* Related Attractions */}
          {relatedAttractions.length > 0 && (
            <section className="mt-16">
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Destinasi {categoryLabels[attraction.category]} Lainnya
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedAttractions.map((related, index) => (
                  <AttractionCard key={related.id} attraction={related} index={index} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default AttractionDetail;
