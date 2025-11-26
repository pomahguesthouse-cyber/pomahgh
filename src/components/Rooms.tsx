import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRooms } from "@/hooks/useRooms";
import { useRoomFeatures } from "@/hooks/useRoomFeatures";
import * as Icons from "lucide-react";
import { BookingDialog } from "./BookingDialog";
import { VirtualTourViewer } from "./VirtualTourViewer";
import type { Room } from "@/hooks/useRooms";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import deluxeRoom from "@/assets/room-deluxe.jpg";
import villaRoom from "@/assets/room-villa.jpg";
import { Eye, Tag, Users, Ruler } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";
import type { CarouselApi } from "@/components/ui/carousel";

const roomImages: Record<string, string> = {
  "Deluxe Ocean View": deluxeRoom,
  "Private Pool Villa": villaRoom,
};
export const Rooms = () => {
  const { data: rooms, isLoading } = useRooms();
  const { data: roomFeatures } = useRoomFeatures();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourRoom, setTourRoom] = useState<Room | null>(null);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);
  const handleBookRoom = (room: Room) => {
    setSelectedRoom(room);
    setBookingOpen(true);
  };
  const handleViewTour = (room: Room) => {
    setTourRoom(room);
    setTourOpen(true);
  };

  const getIconComponent = (iconName: string) => {
    const IconComponent = Icons[iconName as keyof typeof Icons] as any;
    return IconComponent || Icons.Circle;
  };

  if (isLoading) {
    return (
      <section id="rooms" className="py-20 px-4 bg-secondary/30">
        <div className="container mx-auto text-center">
          <p className="text-muted-foreground">Loading rooms...</p>
        </div>
      </section>
    );
  }
  return (
    <>
      <section id="rooms" className="py-20 px-4 bg-secondary/30">
        <div className="container mx-auto">
          <div className="text-center mb-12 sm:mb-16 animate-slide-up">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6 px-2">
              Our Accommodations
            </h2>
            <div className="w-16 sm:w-24 h-1 bg-primary mx-auto mb-4 sm:mb-6"></div>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              Choose from our carefully designed rooms and villas, each offering a unique blend of comfort, style, and
              breathtaking views.
            </p>
          </div>

          <Carousel
            setApi={setApi}
            opts={{
              align: "start",
              loop: true,
            }}
            plugins={[
              Autoplay({
                delay: 4000,
              }),
            ]}
            className="w-full max-w-7xl mx-auto"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {rooms?.map((room) => {
                const images =
                  room.image_urls && room.image_urls.length > 0
                    ? room.image_urls
                    : [roomImages[room.name] || room.image_url];
                const hasPromo =
                  room.promo_price &&
                  room.promo_start_date &&
                  room.promo_end_date &&
                  new Date() >= new Date(room.promo_start_date) &&
                  new Date() <= new Date(room.promo_end_date);
                const displayPrice = room.final_price || room.price_per_night;
                return (
                  <CarouselItem key={room.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                    <Link to={`/rooms/${room.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
                      <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 h-full cursor-pointer">
                      <div className="relative h-48 sm:h-56 md:h-64 overflow-hidden group">
                        {images?.length > 1 ? (
                          <Carousel
                            className="w-full h-full"
                            plugins={[
                              Autoplay({
                                delay: 3000,
                              }),
                            ]}
                          >
                            <CarouselContent>
                              {images.map((image, index) => (
                                <CarouselItem key={index}>
                                  <img
                                    src={image}
                                    alt={`${room.name} - Photo ${index + 1}`}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                  />
                                </CarouselItem>
                              ))}
                            </CarouselContent>
                          </Carousel>
                        ) : (
                          <img
                            src={images?.[0]}
                            alt={room.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        )}

                        {/* Virtual Tour Overlay */}
                        {room.virtual_tour_url && (
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button 
                              variant="hero" 
                              size="lg" 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleViewTour(room);
                              }}
                            >
                              <Eye className="w-5 h-5 mr-2" />
                              View 360° Tour
                            </Button>
                          </div>
                        )}

                        {/* Promo Badge */}
                        {hasPromo && (
                          <div className="absolute top-2 right-2 z-10">
                            <Badge className="bg-red-500 text-white">
                              <Tag className="w-3 h-3 mr-1" />
                              Promo
                            </Badge>
                          </div>
                        )}
                      </div>

                      <CardContent className="p-3 sm:p-4 md:p-6">
                        <div className="flex justify-between items-start mb-2 sm:mb-3">
                          <div className="flex-1 min-w-0 pr-2">
                            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground mb-1 truncate">
                              {room.name}
                            </h3>
                            
                            <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
                              <Users className="h-3 w-3" />
                              <span>{room.max_guests} Tamu</span>
                            </div>

                            {room.size_sqm && (
                              <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
                                <Ruler className="h-3 w-3" />
                                <span>{room.size_sqm} m²</span>
                              </div>
                            )}

                            {room.virtual_tour_url && (
                              <Badge variant="secondary" className="mb-2 text-xs">
                                <Eye className="w-3 h-3 mr-1" />
                                360° Tour
                              </Badge>
                            )}
                          </div>

                          <div className="text-right flex-shrink-0">
                            <p className="text-xs text-muted-foreground">From</p>

                            {hasPromo && (
                              <p className="text-xs line-through text-muted-foreground">
                                Rp {room.price_per_night.toLocaleString("id-ID")}
                              </p>
                            )}

                            <p
                              className={`text-base sm:text-lg md:text-xl font-bold ${
                                hasPromo ? "text-red-500" : "text-primary"
                              }`}
                            >
                              Rp {displayPrice.toLocaleString("id-ID")}
                            </p>

                            <p className="text-xs text-muted-foreground">per night</p>
                          </div>
                        </div>

                        <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-2">
                          {room.description}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
                          {room.features.map((featureId, index) => {
                            const feature = roomFeatures?.find((f) => f.feature_key === featureId);
                            if (!feature) return null;

                            const IconComponent = getIconComponent(feature.icon_name);

                            return (
                              <div
                                key={index}
                                className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 bg-primary/10 text-primary rounded-full text-xs sm:text-sm"
                                title={feature.label}
                              >
                                <IconComponent className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span className="hidden sm:inline">{feature.label}</span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex gap-2">
                          <Button 
                            variant="luxury" 
                            className="flex-1" 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleBookRoom(room);
                            }}
                          >
                            Book Now
                          </Button>

                          {room.virtual_tour_url && (
                            <Button 
                              variant="outline" 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleViewTour(room);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                        </div>

                        {room.room_count && room.room_count > 1}
                      </CardContent>
                    </Card>
                    </Link>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-12" />
            <CarouselNext className="hidden md:flex -right-12" />
          </Carousel>

          <div className="flex justify-center gap-2 mt-8">
            {rooms?.map((_, index) => (
              <button
                key={index}
                className={`h-2 rounded-full transition-all ${index === current ? "w-8 bg-primary" : "w-2 bg-primary/30"}`}
                onClick={() => api?.scrollTo(index)}
              />
            ))}
          </div>
        </div>
      </section>

      <BookingDialog room={selectedRoom} open={bookingOpen} onOpenChange={setBookingOpen} />

      <VirtualTourViewer
        tourUrl={tourRoom?.virtual_tour_url || null}
        roomName={tourRoom?.name || ""}
        open={tourOpen}
        onOpenChange={setTourOpen}
      />
    </>
  );
};
