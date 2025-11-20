import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRooms } from "@/hooks/useRooms";
import { BookingDialog } from "./BookingDialog";
import { VirtualTourViewer } from "./VirtualTourViewer";
import type { Room } from "@/hooks/useRooms";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import deluxeRoom from "@/assets/room-deluxe.jpg";
import villaRoom from "@/assets/room-villa.jpg";
import { Eye } from "lucide-react";

const roomImages: Record<string, string> = {
  "Deluxe Ocean View": deluxeRoom,
  "Private Pool Villa": villaRoom,
};

export const Rooms = () => {
  const { data: rooms, isLoading } = useRooms();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourRoom, setTourRoom] = useState<Room | null>(null);

  const handleBookRoom = (room: Room) => {
    setSelectedRoom(room);
    setBookingOpen(true);
  };

  const handleViewTour = (room: Room) => {
    setTourRoom(room);
    setTourOpen(true);
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
          <div className="text-center mb-16 animate-slide-up">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Our Accommodations
            </h2>
            <div className="w-24 h-1 bg-primary mx-auto mb-6"></div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose from our carefully designed rooms and villas, each offering a unique blend 
              of comfort, style, and breathtaking views.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {rooms?.map((room) => {
              const images = room.image_urls && room.image_urls.length > 0 
                ? room.image_urls 
                : [roomImages[room.name] || room.image_url];
              
              return (
                <Card
                  key={room.id}
                  className="overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
                >
                  <div className="relative h-64 overflow-hidden group">
                    {images.length > 1 ? (
                      <Carousel className="w-full h-full">
                        <CarouselContent>
                          {images.map((image, index) => (
                            <CarouselItem key={index}>
                              <img
                                src={image}
                                alt={`${room.name} - Photo ${index + 1}`}
                                className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                            </CarouselItem>
                          ))}
                        </CarouselContent>
                        <CarouselPrevious className="left-2" />
                        <CarouselNext className="right-2" />
                      </Carousel>
                    ) : (
                      <img
                        src={images[0]}
                        alt={room.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    )}
                  {room.virtual_tour_url && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        variant="hero"
                        size="lg"
                        onClick={() => handleViewTour(room)}
                      >
                        <Eye className="w-5 h-5 mr-2" />
                        View 360° Tour
                      </Button>
                    </div>
                  )}
                </div>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-2xl font-bold text-foreground mb-1">
                        {room.name}
                      </h3>
                      {room.virtual_tour_url && (
                        <Badge variant="secondary" className="mb-2">
                          <Eye className="w-3 h-3 mr-1" />
                          360° Tour Available
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">From</p>
                      <p className="text-xl font-bold text-primary">
                        Rp {room.price_per_night.toLocaleString("id-ID")}
                      </p>
                      <p className="text-xs text-muted-foreground">per night</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-4">{room.description}</p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {room.features.map((feature, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="luxury" 
                      className="flex-1"
                      onClick={() => handleBookRoom(room)}
                    >
                      Book Now
                    </Button>
                    {room.virtual_tour_url && (
                      <Button
                        variant="outline"
                        onClick={() => handleViewTour(room)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  {room.room_count && room.room_count > 1 && (
                    <p className="text-sm mt-3">
                      <strong>Available:</strong> {room.room_count} rooms
                    </p>
                  )}
                  {room.allotment > 0 && (
                    <p className="text-sm text-orange-600 mt-2">
                      <strong>Number of Room:</strong> {room.allotment} rooms reserved
                    </p>
                  )}
                </CardContent>
              </Card>
            );
            })}
          </div>
        </div>
      </section>

      <BookingDialog
        room={selectedRoom}
        open={bookingOpen}
        onOpenChange={setBookingOpen}
      />

      <VirtualTourViewer
        tourUrl={tourRoom?.virtual_tour_url || null}
        roomName={tourRoom?.name || ""}
        open={tourOpen}
        onOpenChange={setTourOpen}
      />
    </>
  );
};
