import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useHeroSlides } from "@/hooks/useHeroSlides";
import heroImage from "@/assets/hero-guesthouse.jpg";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { motion } from "framer-motion";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useSearchDates } from "@/contexts/SearchDatesContext";
import { toast } from "sonner";
export const Hero = () => {
  const { data: slides, isLoading } = useHeroSlides();
  const { checkIn, checkOut, setCheckIn, setCheckOut } = useSearchDates();

  // Use database slides if available, otherwise fallback to default
  const heroSlides =
    slides && slides.length > 0
      ? slides
      : [
          {
            id: "default",
            media_type: "image" as const,
            image_url: heroImage,
            video_url: null,
            overlay_text: "Pomah Guesthouse",
            overlay_subtext: "Experience Tropical Paradise Where Luxury Meets Serenity",
            font_family: "Inter",
            font_size: "text-5xl md:text-7xl lg:text-8xl",
            font_weight: "font-bold",
            text_color: "text-card",
            text_align: "center",
            duration: 5000,
            transition_effect: "fade",
          },
        ];
  const getTransitionClass = (effect: string) => {
    switch (effect) {
      case "slide":
        return "transition-transform duration-1000 ease-in-out";
      case "zoom":
        return "transition-all duration-1000 ease-in-out";
      case "fade":
      default:
        return "transition-opacity duration-1000 ease-in-out";
    }
  };
  if (isLoading) {
    return (
      <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-background"></div>
      </section>
    );
  }
  return (
    <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden">
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        plugins={[
          Autoplay({
            delay: heroSlides[0]?.duration || 5000,
          }),
        ]}
        className="w-full h-full"
      >
        <CarouselContent className="h-screen">
          {heroSlides.map((slide) => (
            <CarouselItem key={slide.id} className="h-screen">
              {/* Background Media - Image or Video */}
              {slide.media_type === "video" && slide.video_url ? (
                <div className="absolute inset-0">
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className={`absolute inset-0 w-full h-full object-cover ${getTransitionClass(slide.transition_effect)}`}
                  >
                    <source src={slide.video_url} type="video/mp4" />
                  </video>
                  <div className="absolute inset-0 hero-gradient"></div>
                </div>
              ) : (
                <div
                  className={`absolute inset-0 bg-cover bg-center bg-no-repeat ${getTransitionClass(slide.transition_effect)}`}
                  style={{
                    backgroundImage: `url(${slide.image_url})`,
                  }}
                >
                  <div className="absolute inset-0 hero-gradient"></div>
                </div>
              )}

              {/* Content */}
              <div
                className={`relative z-10 text-${slide.text_align} px-4 h-full flex flex-col justify-center items-${slide.text_align === "center" ? "center" : slide.text_align === "right" ? "end" : "start"}`}
              >
                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                  className={`text-3xl sm:text-4xl md:text-6xl lg:text-7xl ${slide.font_weight} ${slide.text_color} mb-4 sm:mb-6 px-2`}
                  style={{
                    fontFamily: slide.font_family,
                  }}
                >
                  {slide.overlay_text}
                </motion.h1>
                {slide.overlay_subtext && (
                  <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                    className={`text-base sm:text-lg md:text-xl lg:text-2xl ${slide.text_color}/90 mb-6 sm:mb-8 max-w-2xl px-2 ${slide.text_align === "center" ? "mx-auto" : ""}`}
                  >
                    {slide.overlay_subtext}
                  </motion.p>
                )}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
                  className={`flex flex-col sm:flex-row gap-3 sm:gap-4 px-2 ${slide.text_align === "center" ? "justify-center" : slide.text_align === "right" ? "justify-end" : "justify-start"}`}
                >
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full sm:w-auto justify-start text-left font-normal bg-background/80 backdrop-blur",
                          !checkIn && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {checkIn ? format(checkIn, "dd MMM", { locale: localeId }) : "Check-in"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={checkIn}
                        onSelect={setCheckIn}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return date < today;
                        }}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full sm:w-auto justify-start text-left font-normal bg-background/80 backdrop-blur",
                          !checkOut && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {checkOut ? format(checkOut, "dd MMM", { locale: localeId }) : "Check-out"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={checkOut}
                        onSelect={setCheckOut}
                        disabled={(date) => !checkIn || date <= checkIn}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>

                  <Button
                    variant="hero"
                    size="lg"
                    className="text-white text-sm sm:text-base md:text-lg"
                    onClick={() => {
                      if (!checkIn || !checkOut) {
                        toast.error("Pilih tanggal check-in dan check-out");
                        return;
                      }
                      document.getElementById("rooms")?.scrollIntoView({
                        behavior: "smooth",
                      });
                    }}
                  >
                    Cari Kamar
                  </Button>
                </motion.div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce z-20">
        <div className="w-6 h-10 border-2 border-card/50 rounded-full flex items-start justify-center p-2">
          <div className="w-1 h-3 bg-card/50 rounded-full"></div>
        </div>
      </div>
    </section>
  );
};
