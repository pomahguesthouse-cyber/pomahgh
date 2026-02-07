import React, { useEffect, useMemo, useRef, useState, memo, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { useHeroSlides } from "@/hooks/useHeroSlides";
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

// Preload hero image - use smaller optimized version
const HERO_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1920 1080'%3E%3Crect fill='%230F766E' width='1920' height='1080'/%3E%3C/svg%3E";

// Text animations - memoized
const getTextAnimation = (animation: string | null | undefined, isLoop = false) => {
  const base = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: "easeOut" },
  };

  const map: Record<string, any> = {
    none: { initial: {}, animate: {}, transition: {} },
    "fade-up": base,
    "fade-down": { ...base, initial: { opacity: 0, y: -20 } },
    "fade-left": { ...base, initial: { opacity: 0, x: 30 } },
    "fade-right": { ...base, initial: { opacity: 0, x: -30 } },
    "zoom-in": {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
      transition: { duration: 0.5, ease: "easeOut" },
    },
    bounce: {
      initial: { opacity: 0, y: -40 },
      animate: { opacity: 1, y: 0 },
      transition: isLoop
        ? { type: "spring", bounce: 0.4, duration: 0.8, repeat: Infinity, repeatDelay: 0.5 }
        : { type: "spring", bounce: 0.4, duration: 0.8 },
    },
  };

  return map[animation || "fade-up"] || map["fade-up"];
};

const alignMap = {
  left: { text: "text-left", items: "items-start justify-start", contentPadding: "pl-6 lg:pl-12" },
  center: { text: "text-center", items: "items-center justify-center", contentPadding: "px-4" },
  right: { text: "text-right", items: "items-end justify-end", contentPadding: "pr-6 lg:pr-12" },
} as const;

// Memoized slide component
const HeroSlide = memo(({ slide, showDatePickers, setShowDatePickers, checkIn, checkOut, setCheckIn, setCheckOut }: any) => {
  const titleAnim = getTextAnimation(slide.title_animation, slide.title_animation_loop || false);
  const subtitleAnim = getTextAnimation(slide.subtitle_animation, slide.subtitle_animation_loop || false);
  const align = alignMap[(slide.text_align as keyof typeof alignMap) || "center"];
  const overlayGradient = `linear-gradient(to bottom, ${slide.overlay_gradient_from ?? "#0F766E"}, ${slide.overlay_gradient_to ?? "#000000"})`;

  return (
    <CarouselItem className="h-screen relative">
      {/* Background - use loading="eager" for first slide */}
      {slide.media_type === "video" && slide.video_url ? (
        <div className="absolute inset-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src={slide.video_url} type="video/mp4" />
          </video>
          {(slide.show_overlay ?? true) && (
            <div
              className="absolute inset-0"
              style={{ background: overlayGradient, opacity: slide.overlay_opacity ?? 0.5 }}
              aria-hidden
            />
          )}
        </div>
      ) : (
        <div className="absolute inset-0">
          <img
            src={slide.image_url || HERO_PLACEHOLDER}
            alt={slide.overlay_text || "Hero image"}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {(slide.show_overlay ?? true) && (
            <div
              className="absolute inset-0"
              style={{ background: overlayGradient, opacity: slide.overlay_opacity ?? 0.5 }}
              aria-hidden
            />
          )}
        </div>
      )}

      {/* Content */}
      <div className={`relative z-10 ${align.items} flex flex-col h-full ${align.contentPadding}`}>
        <div className={`w-full max-w-4xl mx-auto ${align.text} text-white`}>
          <motion.h1
            {...titleAnim}
            className={`${slide.font_size ?? "text-3xl sm:text-4xl md:text-6xl lg:text-7xl"} ${slide.font_weight ?? "font-bold"} mb-4 sm:mb-6 px-2`}
            style={{ fontFamily: slide.font_family, color: slide.text_color }}
          >
            {slide.overlay_text}
          </motion.h1>

          {slide.overlay_subtext && (
            <motion.p
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
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
            className={`flex flex-col sm:flex-row items-center gap-3 px-2 ${slide.text_align === "center" ? "justify-center" : slide.text_align === "right" ? "justify-end" : "justify-start"}`}
          >
            <AnimatePresence>
              {showDatePickers && (
                <DatePickerSection checkIn={checkIn} checkOut={checkOut} setCheckIn={setCheckIn} setCheckOut={setCheckOut} />
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
            >
              {showDatePickers ? "Cari Kamar" : "Pilih Tanggal"}
            </Button>
          </motion.div>
        </div>
      </div>
    </CarouselItem>
  );
});

HeroSlide.displayName = "HeroSlide";

// Separate date picker section
const DatePickerSection = memo(({ checkIn, checkOut, setCheckIn, setCheckOut }: any) => (
  <motion.div
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: "auto" }}
    exit={{ opacity: 0, height: 0 }}
    transition={{ duration: 0.25, ease: "easeInOut" }}
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
        />
      </PopoverContent>
    </Popover>
  </motion.div>
));

DatePickerSection.displayName = "DatePickerSection";

// Default slide for immediate render
const DEFAULT_SLIDE = {
  id: "default",
  media_type: "image",
  image_url: null as string | null,
  video_url: null as string | null,
  overlay_text: "Pomah Guesthouse",
  overlay_subtext: "Experience Tropical Paradise Where Luxury Meets Serenity",
  font_family: "Inter",
  font_size: "text-3xl sm:text-4xl md:text-6xl lg:text-7xl",
  font_weight: "font-bold",
  text_color: "#FFFFFF",
  text_align: "center",
  title_animation: "fade-up",
  subtitle_animation: "fade-up",
  show_overlay: true,
  overlay_gradient_from: "#0F766E",
  overlay_gradient_to: "#000000",
  overlay_opacity: 0.45,
  duration: 5000,
};

export default function OptimizedHero() {
  const { data: slidesFromDb, isLoading } = useHeroSlides();
  const { checkIn, checkOut, setCheckIn, setCheckOut } = useSearchDates();
  const [showDatePickers, setShowDatePickers] = useState(false);

  const autoplayRef = useRef(Autoplay({ delay: 5000, stopOnInteraction: false }));
  const carouselRootOpts = useMemo(() => ({ align: "start" as const, loop: true }), []);

  const heroSlides = useMemo(() => 
    slidesFromDb && slidesFromDb.length > 0 ? slidesFromDb : [DEFAULT_SLIDE],
    [slidesFromDb]
  );

  useEffect(() => {
    const delay = heroSlides[0]?.duration ?? 5000;
    if (autoplayRef.current?.destroy) {
      try { autoplayRef.current.destroy(); } catch {}
    }
    autoplayRef.current = Autoplay({ delay, stopOnInteraction: false });
    return () => {
      if (autoplayRef.current?.destroy) {
        try { autoplayRef.current.destroy(); } catch {}
      }
    };
  }, [heroSlides]);

  // Show placeholder immediately, no loading skeleton
  return (
    <section
      id="home"
      className="relative h-screen flex items-center justify-center overflow-hidden bg-primary"
    >
      <Carousel opts={carouselRootOpts} plugins={autoplayRef.current ? [autoplayRef.current] : undefined} className="w-full h-full">
        <CarouselContent className="h-screen">
          {heroSlides.map((slide: any) => (
            <HeroSlide
              key={slide.id}
              slide={slide}
              showDatePickers={showDatePickers}
              setShowDatePickers={setShowDatePickers}
              checkIn={checkIn}
              checkOut={checkOut}
              setCheckIn={setCheckIn}
              setCheckOut={setCheckOut}
            />
          ))}
        </CarouselContent>
      </Carousel>

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
