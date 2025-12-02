import React, { useEffect, useMemo, useRef, useState } from "react";
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

// -----------------------------
// Helper: text animations (kept compact + typed)
// -----------------------------
const getTextAnimation = (animation: string | null | undefined, isLoop = false) => {
  const base = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: "easeOut" },
  };

  const map: Record<string, any> = {
    none: { initial: {}, animate: {}, transition: {} },
    "fade-up": base,
    "fade-down": { ...base, initial: { opacity: 0, y: -20 } },
    "fade-left": { ...base, initial: { opacity: 0, x: 30 } },
    "fade-right": { ...base, initial: { opacity: 0, x: -30 } },
    "zoom-in": {
      initial: { opacity: 0, scale: 0.8 },
      animate: { opacity: 1, scale: 1 },
      transition: { duration: 0.6, ease: "easeOut" },
    },
    bounce: {
      initial: { opacity: 0, y: -50 },
      animate: { opacity: 1, y: 0 },
      transition: isLoop
        ? { type: "spring", bounce: 0.5, duration: 1, repeat: Infinity, repeatDelay: 0.6 }
        : { type: "spring", bounce: 0.5, duration: 1 },
    },
  };

  return map[animation || "fade-up"] || map["fade-up"];
};

// -----------------------------
// Alignment map (Tailwind-safe)
// -----------------------------
const alignMap = {
  left: {
    text: "text-left",
    items: "items-start justify-start",
    contentPadding: "pl-6 lg:pl-12",
  },
  center: {
    text: "text-center",
    items: "items-center justify-center",
    contentPadding: "px-4",
  },
  right: {
    text: "text-right",
    items: "items-end justify-end",
    contentPadding: "pr-6 lg:pr-12",
  },
} as const;

export default function Hero() {
  const { data: slidesFromDb, isLoading } = useHeroSlides();
  const { checkIn, checkOut, setCheckIn, setCheckOut } = useSearchDates();
  const [showDatePickers, setShowDatePickers] = useState(false);

  // Keep a ref to autoplay plugin so we can re-create when duration changes
  const autoplayRef = useRef<any>(null);
  const carouselRootOpts = useMemo(() => ({ align: "start" as const, loop: true }), []);

  // fallback slides
  const heroSlides = (
    slidesFromDb && slidesFromDb.length > 0
      ? slidesFromDb
      : [
          {
            id: "default",
            media_type: "image",
            image_url: heroImage,
            video_url: null,
            overlay_text: "Pomah Guesthouse",
            overlay_subtext: "Experience Tropical Paradise Where Luxury Meets Serenity",
            font_family: "Inter",
            font_size: "text-5xl md:text-7xl lg:text-8xl",
            font_weight: "font-bold",
            text_color: "#FFFFFF",
            text_align: "center",
            title_animation: "fade-up",
            subtitle_animation: "fade-up",
            title_animation_loop: false,
            subtitle_animation_loop: false,
            show_overlay: true,
            overlay_gradient_from: "#0F766E",
            overlay_gradient_to: "#000000",
            overlay_opacity: 0.45,
            duration: 5000,
            transition_effect: "fade",
          },
        ]
  ) as any[];

  // Build an autoplay plugin *per current first slide duration* — simpler and predictable
  useEffect(() => {
    // create plugin using first slide duration (if slides exist)
    const delay = heroSlides[0]?.duration ?? 5000;
    // destroy old plugin if exists
    if (autoplayRef.current && typeof autoplayRef.current.destroy === "function") {
      try {
        autoplayRef.current.destroy();
      } catch (e) {
        // ignore
      }
    }

    autoplayRef.current = Autoplay({ delay, stopOnInteraction: false });

    // cleanup on unmount
    return () => {
      if (autoplayRef.current && typeof autoplayRef.current.destroy === "function") {
        try {
          autoplayRef.current.destroy();
        } catch (e) {
          // noop
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroSlides[0]?.duration]);

  if (isLoading) {
    return (
      <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-background" />
      </section>
    );
  }

  return (
    <section
      id="home"
      className="relative h-screen flex items-center justify-center overflow-hidden"
      aria-label="Hero banner"
    >
      <Carousel opts={carouselRootOpts} plugins={[autoplayRef.current]} className="w-full h-full">
        <CarouselContent className="h-screen">
          {heroSlides.map((slide) => {
            const titleAnim = getTextAnimation(slide.title_animation, slide.title_animation_loop || false);
            const subtitleAnim = getTextAnimation(slide.subtitle_animation, slide.subtitle_animation_loop || false);
            const align = alignMap[(slide.text_align as keyof typeof alignMap) || "center"];

            const transitionClass = (() => {
              switch (slide.transition_effect) {
                case "slide":
                  return "transition-transform duration-1000 ease-in-out";
                case "zoom":
                  return "transition-all duration-1000 ease-in-out";
                case "fade":
                default:
                  return "transition-opacity duration-1000 ease-in-out";
              }
            })();

            const overlayGradient = `linear-gradient(to bottom, ${slide.overlay_gradient_from ?? "#0F766E"}, ${slide.overlay_gradient_to ?? "#000000"})`;

            return (
              <CarouselItem key={slide.id} className="h-screen relative">
                {/* Background media */}
                {slide.media_type === "video" && slide.video_url ? (
                  <div className="absolute inset-0">
                    <video
                      autoPlay
                      loop
                      muted
                      playsInline
                      className={cn("absolute inset-0 w-full h-full object-cover", transitionClass)}
                    >
                      <source src={slide.video_url} type="video/mp4" />
                    </video>
                    {/* overlay */}
                    {(slide.show_overlay ?? true) && (
                      <div
                        className="absolute inset-0"
                        style={{ background: overlayGradient, opacity: slide.overlay_opacity ?? 0.5 }}
                        aria-hidden
                      />
                    )}
                  </div>
                ) : (
                  <div
                    className={cn("absolute inset-0 bg-cover bg-center bg-no-repeat", transitionClass)}
                    style={{ backgroundImage: `url(${slide.image_url})` }}
                    role="img"
                    aria-label={slide.overlay_text || "hero image"}
                  >
                    {(slide.show_overlay ?? true) && (
                      <div
                        className="absolute inset-0"
                        style={{ background: overlayGradient, opacity: slide.overlay_opacity ?? 0.5 }}
                        aria-hidden
                      />
                    )}
                  </div>
                )}

                {/* Content wrapper */}
                <div className={`relative z-10 ${align.items} flex flex-col h-full ${align.contentPadding}`}>
                  <div className={`w-full max-w-4xl mx-auto ${align.text} text-white`}>
                    <motion.h1
                      key={`title-${slide.id}`}
                      {...titleAnim}
                      className={`${slide.font_size ?? "text-3xl sm:text-4xl md:text-6xl lg:text-7xl"} ${slide.font_weight ?? "font-bold"} mb-4 sm:mb-6 px-2`}
                      style={{ fontFamily: slide.font_family, color: slide.text_color }}
                    >
                      {slide.overlay_text}
                    </motion.h1>

                    {slide.overlay_subtext && (
                      <motion.p
                        key={`subtitle-${slide.id}`}
                        {...subtitleAnim}
                        className={`${slide.subtitle_font_size ?? "text-base sm:text-lg md:text-xl lg:text-2xl"} ${slide.subtitle_font_weight ?? "font-normal"} mb-6 sm:mb-8 max-w-2xl px-2 ${slide.text_align === "center" ? "mx-auto" : ""}`}
                        style={{
                          fontFamily: slide.subtitle_font_family ?? slide.font_family,
                          color: slide.subtitle_text_color ?? slide.text_color,
                        }}
                      >
                        {slide.overlay_subtext}
                      </motion.p>
                    )}

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
                      className={`flex flex-col sm:flex-row items-center gap-3 px-2 ${slide.text_align === "center" ? "justify-center" : slide.text_align === "right" ? "justify-end" : "justify-start"}`}
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
                                    !checkIn && "text-muted-foreground",
                                  )}
                                  aria-label="Pilih tanggal check-in"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {checkIn ? format(checkIn, "dd MMM", { locale: localeId }) : "Check-in"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start" sideOffset={8}>
                                <Calendar
                                  mode="single"
                                  selected={checkIn}
                                  onSelect={setCheckIn}
                                  disabled={(date: Date) => {
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
                                    !checkOut && "text-muted-foreground",
                                  )}
                                  aria-label="Pilih tanggal check-out"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {checkOut ? format(checkOut, "dd MMM", { locale: localeId }) : "Check-out"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start" sideOffset={8}>
                                <Calendar
                                  mode="single"
                                  selected={checkOut}
                                  onSelect={setCheckOut}
                                  disabled={(date: Date) => !checkIn || date <= checkIn}
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
                            return;
                          }

                          if (!checkIn || !checkOut) {
                            toast.error("Pilih tanggal check-in dan check-out");
                            return;
                          }

                          document.getElementById("rooms")?.scrollIntoView({ behavior: "smooth" });
                        }}
                        aria-label={showDatePickers ? "Cari Kamar" : "Pilih Tanggal"}
                      >
                        {showDatePickers ? "Cari Kamar" : "Pilih Tanggal"}
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      {/* Scroll Indicator hidden when datepicker open */}
      {!showDatePickers && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce z-20" aria-hidden>
          <div className="w-6 h-10 border-2 border-card/50 rounded-full flex items-start justify-center p-2">
            <div className="w-1 h-3 bg-card/50 rounded-full" />
          </div>
        </div>
      )}
    </section>
  );
}
