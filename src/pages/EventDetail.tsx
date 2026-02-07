import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, MapPin, User, Phone, Globe, ArrowLeft, Share2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CityEvent } from "@/types/event.types";

const EventDetail = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: event, isLoading, error } = useQuery({
    queryKey: ["city-event", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("city_events")
        .select("*")
        .eq("slug", slug!)
        .eq("is_active", true)
        .single();

      if (error) throw error;
      return data as CityEvent;
    },
    enabled: !!slug,
  });

  const formatEventDate = (date: string, endDate?: string | null) => {
    const start = new Date(date);
    if (endDate) {
      const end = new Date(endDate);
      return `${format(start, "EEEE, d MMMM yyyy", { locale: localeId })} - ${format(end, "EEEE, d MMMM yyyy", { locale: localeId })}`;
    }
    return format(start, "EEEE, d MMMM yyyy", { locale: localeId });
  };

  const isEventPast = (date: string) => {
    return new Date(date) < new Date();
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: event?.name,
        text: event?.description || "",
        url: window.location.href,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-20">
          <div className="container mx-auto px-4 py-8">
            <Skeleton className="h-8 w-48 mb-4" />
            <Skeleton className="h-80 w-full rounded-xl mb-6" />
            <Skeleton className="h-12 w-3/4 mb-4" />
            <Skeleton className="h-6 w-1/2" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-20">
          <div className="container mx-auto px-4 py-16 text-center">
            <h1 className="text-2xl font-bold mb-4">Event Tidak Ditemukan</h1>
            <p className="text-muted-foreground mb-8">
              Event yang Anda cari tidak tersedia atau sudah dihapus.
            </p>
            <Button asChild>
              <Link to="/explore-semarang">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali ke Explore
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const breadcrumbItems = [
    { label: "Beranda", href: "/" },
    { label: "Explore Semarang", href: "/explore-semarang" },
    { label: event.name },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{event.name} | Event Semarang - Pomah Guesthouse</title>
        <meta name="description" content={event.description || `${event.name} - Event di Semarang`} />
        <meta property="og:title" content={event.name} />
        <meta property="og:description" content={event.description || ""} />
        {event.image_url && <meta property="og:image" content={event.image_url} />}
      </Helmet>

      <Header />
      
      <main className="pt-20">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumb items={breadcrumbItems} />

          {/* Hero Image */}
          <div className="relative aspect-[21/9] rounded-2xl overflow-hidden bg-muted mb-8">
            {event.image_url ? (
              <img
                src={event.image_url}
                alt={event.image_alt || event.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <Calendar className="h-24 w-24 text-primary/40" />
              </div>
            )}
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            
            {/* Date badge */}
            <div className="absolute bottom-6 left-6 bg-background/95 backdrop-blur-sm rounded-xl px-4 py-3 text-center shadow-lg">
              <div className="text-3xl font-bold text-primary leading-none">
                {format(new Date(event.event_date), "d")}
              </div>
              <div className="text-sm uppercase font-medium text-muted-foreground">
                {format(new Date(event.event_date), "MMM yyyy", { locale: localeId })}
              </div>
            </div>

            {/* Actions */}
            <div className="absolute bottom-6 right-6 flex gap-2">
              <Button variant="secondary" size="icon" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge variant="secondary" className="capitalize">
                    {event.category}
                  </Badge>
                  {isEventPast(event.event_date) && (
                    <Badge variant="outline">Event Selesai</Badge>
                  )}
                </div>
                
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  {event.name}
                </h1>

                {event.description && (
                  <p className="text-lg text-muted-foreground">
                    {event.description}
                  </p>
                )}
              </div>

              {event.long_description && (
                <div className="prose prose-lg max-w-none">
                  <h2 className="text-xl font-semibold mb-4">Tentang Event</h2>
                  <p className="text-muted-foreground whitespace-pre-line">
                    {event.long_description}
                  </p>
                </div>
              )}

              {/* Gallery */}
              {event.gallery_images && event.gallery_images.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Galeri</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {event.gallery_images.map((url, index) => (
                      <div key={index} className="aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                        <img
                          src={url}
                          alt={`${event.name} - Foto ${index + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-semibold text-lg">Informasi Event</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <div className="font-medium">Tanggal</div>
                        <div className="text-sm text-muted-foreground">
                          {formatEventDate(event.event_date, event.event_end_date)}
                        </div>
                      </div>
                    </div>

                    {event.event_time && (
                      <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <div className="font-medium">Waktu</div>
                          <div className="text-sm text-muted-foreground">{event.event_time}</div>
                        </div>
                      </div>
                    )}

                    {event.venue && (
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <div className="font-medium">Lokasi</div>
                          <div className="text-sm text-muted-foreground">{event.venue}</div>
                          {event.address && (
                            <div className="text-sm text-muted-foreground">{event.address}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {event.organizer && (
                      <div className="flex items-start gap-3">
                        <User className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <div className="font-medium">Penyelenggara</div>
                          <div className="text-sm text-muted-foreground">{event.organizer}</div>
                        </div>
                      </div>
                    )}

                    {event.contact_info && (
                      <div className="flex items-start gap-3">
                        <Phone className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <div className="font-medium">Kontak</div>
                          <div className="text-sm text-muted-foreground">{event.contact_info}</div>
                        </div>
                      </div>
                    )}

                    {event.website_url && (
                      <div className="flex items-start gap-3">
                        <Globe className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <div className="font-medium">Website</div>
                          <a 
                            href={event.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            Kunjungi Website
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {event.price_range && (
                    <div className="pt-4 border-t border-border">
                      <div className="text-sm text-muted-foreground mb-1">Harga Tiket</div>
                      <div className="text-xl font-semibold text-primary">{event.price_range}</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-primary text-primary-foreground">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-2">Menginap di Semarang?</h3>
                  <p className="text-sm opacity-90 mb-4">
                    Pomah Guesthouse siap menyambut Anda dengan penginapan nyaman dan terjangkau.
                  </p>
                  <Button variant="secondary" className="w-full" asChild>
                    <Link to="/">Lihat Kamar Tersedia</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default EventDetail;
