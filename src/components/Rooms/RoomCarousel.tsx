import { useRef } from "react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { RoomCard } from "./RoomCard";
import { getRoomImages } from "./utils/getRoomImages";
import { checkPromo, getDisplayPrice } from "./utils/checkPromo";
import type { RoomCarouselProps } from "./types";

export const RoomCarousel = ({
  rooms,
  availability,
  isCheckingAvailability,
  roomFeatures,
  onBookRoom,
  onViewTour,
  setApi,
  checkIn,
  checkOut,
}: RoomCarouselProps) => {
  const autoplayPlugin = useRef(
    Autoplay({ delay: 4000, stopOnInteraction: true })
  );

  return (
    <Carousel
      setApi={setApi}
      opts={{
        align: "start",
        loop: true,
      }}
      plugins={[autoplayPlugin.current]}
      className="w-full max-w-7xl mx-auto"
    >
      <CarouselContent className="-ml-2 md:-ml-4">
        {rooms?.map((room) => {
          const images = getRoomImages(room);
          const hasPromo = checkPromo(room);
          const displayPrice = getDisplayPrice(room);
          const isAvailabilityLoaded = checkIn && checkOut && !isCheckingAvailability && !!availability;

          return (
            <CarouselItem key={room.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
              <RoomCard
                room={room}
                hasPromo={hasPromo}
                displayPrice={displayPrice}
                images={images}
                availability={availability?.[room.id]}
                isAvailabilityLoaded={!!isAvailabilityLoaded}
                roomFeatures={roomFeatures}
                onBookRoom={onBookRoom}
                onViewTour={onViewTour}
              />
            </CarouselItem>
          );
        })}
      </CarouselContent>
      <CarouselPrevious className="hidden md:flex -left-12" />
      <CarouselNext className="hidden md:flex -right-12" />
    </Carousel>
  );
};
