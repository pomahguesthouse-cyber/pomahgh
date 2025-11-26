import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useHeroSlides } from "@/hooks/useHeroSlides";
import heroImage from "@/assets/hero-guesthouse.jpg";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useSearchDates } from "@/contexts/SearchDatesContext";
import { toast } from "sonner";

const getTextAnimation = (animation: string | null | undefined, isLoop: boolean = false) => {
  const animations: Record<string, { initial: any; animate: any; transition: any }> = {
    "none": {
      initial: {},
      animate: {},
      transition: {}
    },
    "fade-up": {
      initial: { opacity: 0, y: 30 },
      animate: { opacity: 1, y: 0 },
      transition: { 
        duration: 0.8, 
        ease: "easeOut",
        ...(isLoop && { repeat: Infinity, repeatType: "reverse" as const, repeatDelay: 0.5 })
      }
    },
    "fade-down": {
      initial: { opacity: 0, y: -30 },
      animate: { opacity: 1, y: 0 },
      transition: { 
        duration: 0.8, 
        ease: "easeOut",
        ...(isLoop && { repeat: Infinity, repeatType: "reverse" as const, repeatDelay: 0.5 })
      }
    },
    "fade-left": {
      initial: { opacity: 0, x: 50 },
      animate: { opacity: 1, x: 0 },
      transition: { 
        duration: 0.8, 
        ease: "easeOut",
        ...(isLoop && { repeat: Infinity, repeatType: "reverse" as const, repeatDelay: 0.5 })
      }
    },
    "fade-right": {
      initial: { opacity: 0, x: -50 },
      animate: { opacity: 1, x: 0 },
      transition: { 
        duration: 0.8, 
        ease: "easeOut",
        ...(isLoop && { repeat: Infinity, repeatType: "reverse" as const, repeatDelay: 0.5 })
      }
    },
    "zoom-in": {
      initial: { opacity: 0, scale: 0.5 },
      animate: { opacity: 1, scale: 1 },
      transition: { 
        duration: 0.6, 
        ease: [0.34, 1.56, 0.64, 1],
        ...(isLoop && { repeat: Infinity, repeatType: "reverse" as const, repeatDelay: 0.5 })
      }
    },
    "zoom-out": {
      initial: { opacity: 0, scale: 1.5 },
      animate: { opacity: 1, scale: 1 },
      transition: { 
        duration: 0.6, 
        ease: "easeOut",
        ...(isLoop && { repeat: Infinity, repeatType: "reverse" as const, repeatDelay: 0.5 })
      }
    },
    "bounce": {
      initial: { opacity: 0, y: -100 },
      animate: { opacity: 1, y: 0 },
      transition: isLoop 
        ? { type: "spring", bounce: 0.5, duration: 1, repeat: Infinity, repeatDelay: 0.5 }
        : { type: "spring", bounce: 0.5, duration: 1 }
    },
    "blur-in": {
      initial: { opacity: 0, filter: "blur(20px)" },
      animate: { opacity: 1, filter: "blur(0px)" },
      transition: { 
        duration: 0.8, 
        ease: "easeOut",
        ...(isLoop && { repeat: Infinity, repeatType: "mirror" as const, repeatDelay: 0.5 })
      }
    },
    "slide-up": {
      initial: { y: 100 },
      animate: { y: 0 },
      transition: { 
        duration: 0.6, 
        ease: [0.25, 0.46, 0.45, 0.94],
        ...(isLoop && { repeat: Infinity, repeatType: "reverse" as const, repeatDelay: 0.5 })
      }
    },
    "scale-rotate": {
      initial: { opacity: 0, scale: 0.5, rotate: -10 },
      animate: { opacity: 1, scale: 1, rotate: 0 },
      transition: { 
        duration: 0.7, 
        ease: "easeOut",
        ...(isLoop && { repeat: Infinity, repeatType: "reverse" as const, repeatDelay: 0.5 })
      }
    },
  };
  return animations[animation || "fade-up"] || animations["fade-up"];
};

export const Hero = () => {
  const { data: slides, isLoading } = useHeroSlides();
  const { checkIn, checkOut, setCheckIn, setCheckOut } = useSearchDates();
  const [showDatePickers, setShowDatePickers] = useState(false);

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
            title_animation: "fade-up",
            subtitle_animation: "fade-up",
            title_animation_loop: false,
            subtitle_animation_loop: false,
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
          {heroSlides.map((slide) => {
            const titleAnim = getTextAnimation(slide.title_animation, slide.title_animation_loop || false);
            const subtitleAnim = getTextAnimation(slide.subtitle_animation, slide.subtitle_animation_loop || false);
            
            return (
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
                    key={`title-${slide.id}`}
                    {...titleAnim}
                    className={`${slide.font_size || "text-3xl sm:text-4xl md:text-6xl lg:text-7xl"} ${slide.font_weight} mb-4 sm:mb-6 px-2`}
                    style={{
                      fontFamily: slide.font_family,
                      color: slide.text_color,
                    }}
                  >
                    {slide.overlay_text}
                  </motion.h1>
                  {slide.overlay_subtext && (
                    <motion.p
                      key={`subtitle-${slide.id}`}
                      {...subtitleAnim}
                      className={`${slide.subtitle_font_size || "text-base sm:text-lg md:text-xl lg:text-2xl"} ${slide.subtitle_font_weight || "font-normal"} mb-6 sm:mb-8 max-w-2xl px-2 ${slide.text_align === "center" ? "mx-auto" : ""}`}
                      style={{
                        fontFamily: slide.subtitle_font_family || slide.font_family,
                        color: slide.subtitle_text_color || slide.text_color,
                      }}
                    >
                      {slide.overlay_subtext}
                    </motion.p>
                  )}
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
                    className={`flex flex-col items-center gap-3 px-2 ${slide.text_align === "center" ? "justify-center" : slide.text_align === "right" ? "justify-end" : "justify-start"}`}
                  >
                    <AnimatePresence>
                      {showDatePickers && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="flex flex-col sm:flex-row gap-3 overflow-hidden"
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
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Button
                      variant="hero"
                      size="lg"
                      className="text-white text-sm sm:text-base md:text-lg"
                      onClick={() => {
                        if (!showDatePickers) {
                          setShowDatePickers(true);
                        } else {
                          if (!checkIn || !checkOut) {
                            toast.error("Pilih tanggal check-in dan check-out");
                            return;
                          }
                          document.getElementById("rooms")?.scrollIntoView({
                            behavior: "smooth",
                          });
                        }
                      }}
                    >
                      {showDatePickers ? "Cari Kamar" : "Pilih Tanggal"}
                    </Button>
                  </motion.div>
                </div>
              </CarouselItem>
            );
          })}
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