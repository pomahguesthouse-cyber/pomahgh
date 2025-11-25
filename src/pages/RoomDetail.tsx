import { useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useRoomDetail } from "@/hooks/useRoomDetail";
import { useRooms } from "@/hooks/useRooms";
import { useRoomFeatures } from "@/hooks/useRoomFeatures";
import * as Icons from "lucide-react";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ImageGallery } from "@/components/ImageGallery";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BookingDialog } from "@/components/BookingDialog";
import { VirtualTourViewer } from "@/components/VirtualTourViewer";
import { Loader2, Users, Maximize, Tag, Eye, Bed } from "lucide-react";
import type { Room } from "@/hooks/useRooms";

const RoomDetail = () => {
  const { roomSlug } = useParams<{ roomSlug: string }>();
  const { data: room, isLoading, error } = useRoomDetail(roomSlug || "");
  const { data: allRooms } = useRooms();
  const { data: roomFeatures } = useRoomFeatures();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  const getIconComponent = (iconName: string) => {
    const IconComponent = Icons[iconName as keyof typeof Icons] as any;
    return IconComponent || Icons.Circle;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !room) {
    return <Navigate to="/404" replace />;
  }

  const images = room.image_urls && room.image_urls.length > 0 
    ? room.image_urls 
    : [room.image_url];

  const hasPromo = room.promo_price &&
    room.promo_start_date &&
    room.promo_end_date &&
    new Date() >= new Date(room.promo_start_date) &&
    new Date() <= new Date(room.promo_end_date);

  const displayPrice = room.final_price || room.price_per_night;

  const relatedRooms = allRooms?.filter(r => r.id !== room.id).slice(0, 3) || [];

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
    <>
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

      <Header />

      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumb
            items={[
              { label: "Rooms", href: "/#rooms" },
              { label: room.name }
            ]}
          />

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Images and Details */}
            <div className="lg:col-span-2 space-y-8">
              <ImageGallery images={images} roomName={room.name} />

              {/* Room Info */}
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                      {room.name}
                    </h1>
                    {room.virtual_tour_url && (
                      <Badge variant="secondary" className="mb-2">
                        <Eye className="w-3 h-3 mr-1" />
                        360° Tour Available
                      </Badge>
                    )}
                  </div>
                  
                  {hasPromo && (
                    <Badge className="bg-red-500 text-white">
                      <Tag className="w-3 h-3 mr-1" />
                      Promo Active
                    </Badge>
                  )}
                </div>

                <p className="text-lg text-muted-foreground leading-relaxed">
                  {room.description}
                </p>
              </div>

              {/* Features */}
              <div>
                <h2 className="text-2xl font-bold mb-4">Room Features</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {room.features.map((featureId) => {
                    const feature = roomFeatures?.find((f) => f.feature_key === featureId);
                    if (!feature) return null;

                    const IconComponent = getIconComponent(feature.icon_name);

                    return (
                      <div
                        key={featureId}
                        className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg"
                      >
                        <IconComponent className="h-5 w-5 text-primary flex-shrink-0" />
                        <span className="text-sm font-medium">{feature.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Room Specs */}
              <div>
                <h2 className="text-2xl font-bold mb-4">Room Specifications</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                      <Users className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Max Guests</p>
                        <p className="font-semibold">{room.max_guests} persons</p>
                      </div>
                    </CardContent>
                  </Card>

                  {room.size_sqm && (
                    <Card>
                      <CardContent className="p-4 flex items-center gap-3">
                        <Maximize className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Room Size</p>
                          <p className="font-semibold">{room.size_sqm} m²</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {room.room_count > 1 && (
                    <Card>
                      <CardContent className="p-4 flex items-center gap-3">
                        <Bed className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Available Units</p>
                          <p className="font-semibold">{room.room_count} rooms</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              {/* Virtual Tour */}
              {room.virtual_tour_url && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">Virtual Tour</h2>
                  <Button
                    variant="luxury"
                    size="lg"
                    onClick={() => setTourOpen(true)}
                    className="w-full"
                  >
                    <Eye className="w-5 h-5 mr-2" />
                    View 360° Virtual Tour
                  </Button>
                </div>
              )}
            </div>

            {/* Right Column - Booking Card */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardContent className="p-6 space-y-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Starting from</p>
                    {hasPromo && (
                      <p className="text-sm line-through text-muted-foreground">
                        Rp {room.price_per_night.toLocaleString("id-ID")}
                      </p>
                    )}
                    <p className={`text-3xl font-bold ${hasPromo ? "text-red-500" : "text-primary"}`}>
                      Rp {displayPrice.toLocaleString("id-ID")}
                    </p>
                    <p className="text-sm text-muted-foreground">per night</p>
                  </div>

                  <Button
                    variant="luxury"
                    size="lg"
                    className="w-full"
                    onClick={() => setBookingOpen(true)}
                  >
                    Book This Room
                  </Button>

                  <div className="pt-4 border-t space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Check-in</span>
                      <span className="font-medium">From 14:00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Check-out</span>
                      <span className="font-medium">Until 12:00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Availability</span>
                      <span className="font-medium text-green-600">Available</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Related Rooms */}
          {relatedRooms.length > 0 && (
            <div className="mt-16">
              <h2 className="text-3xl font-bold mb-8 text-center">Other Rooms You May Like</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {relatedRooms.map((relatedRoom) => (
                  <Card key={relatedRoom.id} className="overflow-hidden hover:shadow-xl transition-shadow">
                    <img
                      src={relatedRoom.image_url}
                      alt={relatedRoom.name}
                      className="w-full h-48 object-cover"
                    />
                    <CardContent className="p-4">
                      <h3 className="font-bold text-lg mb-2">{relatedRoom.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {relatedRoom.description}
                      </p>
                      <div className="flex justify-between items-center">
                        <p className="text-lg font-bold text-primary">
                          Rp {(relatedRoom.final_price || relatedRoom.price_per_night).toLocaleString("id-ID")}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const slug = relatedRoom.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                            window.location.href = `/rooms/${slug}`;
                          }}
                        >
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />

      <BookingDialog
        room={room as Room}
        open={bookingOpen}
        onOpenChange={setBookingOpen}
      />

      <VirtualTourViewer
        tourUrl={room.virtual_tour_url || null}
        roomName={room.name}
        open={tourOpen}
        onOpenChange={setTourOpen}
      />
    </>
  );
};

export default RoomDetail;
