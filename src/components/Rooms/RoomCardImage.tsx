import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Eye, Tag } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";
import type { RoomCardImageProps } from "./types";

const getTransitionClass = (effect?: string) => {
  switch (effect) {
    case "fade":
      return "animate-fade-in";
    case "blur":
      return "transition-all duration-700 data-[active=false]:blur-sm data-[active=false]:opacity-0 data-[active=true]:blur-0 data-[active=true]:opacity-100";
    case "zoom":
      return "transition-transform duration-700 data-[active=false]:scale-75 data-[active=false]:opacity-0 data-[active=true]:scale-100 data-[active=true]:opacity-100";
    case "flip":
      return "transition-all duration-700 data-[active=false]:rotate-y-90 data-[active=false]:opacity-0 data-[active=true]:rotate-y-0 data-[active=true]:opacity-100";
    case "slide":
    default:
      return "transition-transform duration-500";
  }
};

export const RoomCardImage = ({ room, images, hasPromo, onViewTour }: RoomCardImageProps) => {
  const transitionEffect = (room as any).transition_effect || "slide";
  const transitionClass = getTransitionClass(transitionEffect);

  return (
    <div className="relative h-64 overflow-hidden group">
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
                  className={`w-full h-full object-cover ${
                    transitionEffect === "slide" 
                      ? "transition-transform duration-500 group-hover:scale-110" 
                      : transitionClass
                  }`}
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
              onViewTour(room);
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

      {/* 360° Tour Badge */}
      {room.virtual_tour_url && (
        <div className="absolute top-2 left-2 z-10">
          <Badge 
            className="bg-black/70 text-white cursor-pointer hover:bg-black/80 transition-colors"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onViewTour(room);
            }}
          >
            <Eye className="w-3 h-3 mr-1" />
            360°
          </Badge>
        </div>
      )}
    </div>
  );
};
