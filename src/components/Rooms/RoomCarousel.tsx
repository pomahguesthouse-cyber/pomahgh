import { useRef } from "react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import RoomCard from "./RoomCard";
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
  const autoplayPlugin = useRef(Autoplay({ delay: 4000, stopOnInteraction: true }));

  return (
    <div className="w-full overflow-visible">
      <Carousel
        setApi={setApi}
        opts={{
          align: "start",
          loop: true,
          dragFree: true,
        }}
        plugins={[autoplayPlugin.current]}
        className="w-full max-w-7xl mx-auto overflow-visible"
      >
        <CarouselContent
          className="
            overflow-visible 
            gap-4 
            px-1 sm:px-2 
          "
        >
        {rooms?.map((room) => (
          <CarouselItem
            key={room.id}
            className="
              basis-full
              sm:basis-1/2 
              lg:basis-1/3
              overflow-visible
            "
          >
            <RoomCard
              room={room}
              features={roomFeatures}
              availability={availability}
              onBook={onBookRoom}
              onTour={onViewTour}
            />
          </CarouselItem>
        ))}
        </CarouselContent>

        {/* ARROWS */}
        <CarouselPrevious
          className="
            hidden md:flex 
            -left-10 
            bg-white shadow-lg 
            hover:shadow-xl 
            rounded-full 
          "
        />
        <CarouselNext
          className="
            hidden md:flex 
            -right-10 
            bg-white shadow-lg 
            hover:shadow-xl 
            rounded-full 
          "
        />
      </Carousel>
    </div>
  );
};
