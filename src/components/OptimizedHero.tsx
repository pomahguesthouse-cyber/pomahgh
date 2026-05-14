import React, { useEffect, useMemo, useRef, memo } from "react";
import { useHeroSlides, type HeroSlide as HeroSlideType } from "@/hooks/useHeroSlides";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

const HERO_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1920 1080'%3E%3Crect fill='%230F766E' width='1920' height='1080'/%3E%3C/svg%3E";

/**
 * Map a slide-animation key to a className string built from
 * tailwindcss-animate utilities (already in the bundle via shadcn).
 *
 * Replaces the previous framer-motion-based getTextAnimation() so that
 * the homepage hero no longer pulls framer-motion into the critical path.
 */
const getTextAnimationClass = (
  animation: string | null | undefined,
  isLoop = false,
): string => {
  switch (animation) {
    case "none":
      return "";
    case "fade-down":
      return "animate-in fade-in slide-in-from-top-4 duration-700 ease-out";
    case "fade-left":
      return "animate-in fade-in slide-in-from-right-4 duration-700 ease-out";
    case "fade-right":
      return "animate-in fade-in slide-in-from-left-4 duration-700 ease-out";
    case "zoom-in":
      return "animate-in fade-in zoom-in-95 duration-500 ease-out";
    case "bounce":
      return isLoop
        ? "animate-bounce"
        : "animate-in fade-in slide-in-from-top-8 duration-700 ease-out";
    case "fade-up":
    default:
      return "animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out";
  }
};

const alignMap = {
  left: { text: "text-left", items: "items-start justify-start", contentPadding: "pl-6 lg:pl-12" },
  center: { text: "text-center", items: "items-center justify-center", contentPadding: "px-4" },
  right: { text: "text-right", items: "items-end justify-end", contentPadding: "pr-6 lg:pr-12" },
} as const;

interface HeroSlideProps {
  slide: HeroSlideType | typeof DEFAULT_SLIDE;
  isPrimary?: boolean;
}

const HeroSlide = memo(({ slide, isPrimary }: HeroSlideProps) => {
  const titleAnimClass = getTextAnimationClass(slide.title_animation, slide.title_animation_loop || false);
  const subtitleAnimClass = getTextAnimationClass(slide.subtitle_animation, slide.subtitle_animation_loop || false);
  const align = alignMap[(slide.text_align as keyof typeof alignMap) || "center"];
  const overlayGradient = `linear-gradient(to bottom, ${slide.overlay_gradient_from ?? "#0F766E"}, ${slide.overlay_gradient_to ?? "#000000"})`;

  return (
    <CarouselItem className="h-screen relative">
      {slide.media_type === "video" && slide.video_url ? (
        <div className="absolute inset-0">
          <video autoPlay loop muted playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover">
            <source src={slide.video_url} type="video/mp4" />
          </video>
          {(slide.show_overlay ?? true) && (
            <div className="absolute inset-0" style={{ background: overlayGradient, opacity: slide.overlay_opacity ?? 0.5 }} aria-hidden />
          )}
        </div>
      ) : (
        <div className="absolute inset-0">
          <img
            src={slide.image_url || HERO_PLACEHOLDER}
            alt={slide.overlay_text || "Hero image"}
            loading={isPrimary ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={isPrimary ? "high" : undefined}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {(slide.show_overlay ?? true) && (
            <div className="absolute inset-0" style={{ background: overlayGradient, opacity: slide.overlay_opacity ?? 0.5 }} aria-hidden />
          )}
        </div>
      )}

      <div className={`relative z-10 ${align.items} flex flex-col h-full ${align.contentPadding}`}>
        <div className={`w-full max-w-4xl mx-auto ${align.text} text-white`}>
          <h1
            className={`${slide.font_size ?? "text-3xl sm:text-4xl md:text-6xl lg:text-7xl"} ${slide.font_weight ?? "font-bold"} mb-4 sm:mb-6 px-2 ${titleAnimClass}`}
            style={{ fontFamily: slide.font_family, color: slide.text_color }}
          >
            {slide.overlay_text}
          </h1>

          {slide.overlay_subtext && (
            <p
              className={`${slide.subtitle_font_size ?? "text-base sm:text-lg md:text-xl lg:text-2xl"} ${slide.subtitle_font_weight ?? "font-normal"} mb-6 sm:mb-8 max-w-2xl px-2 ${slide.text_align === "center" ? "mx-auto" : ""} ${subtitleAnimClass}`}
              style={{
                fontFamily: slide.subtitle_font_family ?? slide.font_family,
                color: slide.subtitle_text_color ?? slide.text_color,
              }}
            >
              {slide.overlay_subtext}
            </p>
          )}
        </div>
      </div>
    </CarouselItem>
  );
});

HeroSlide.displayName = "HeroSlide";

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
  title_animation_loop: false as boolean | null,
  subtitle_animation: "fade-up",
  subtitle_animation_loop: false as boolean | null,
  subtitle_font_family: null as string | null,
  subtitle_font_size: null as string | null,
  subtitle_font_weight: null as string | null,
  subtitle_text_color: null as string | null,
  show_overlay: true,
  overlay_gradient_from: "#0F766E",
  overlay_gradient_to: "#000000",
  overlay_opacity: 0.45,
  duration: 5000,
};

export default function OptimizedHero() {
  const { data: slidesFromDb } = useHeroSlides();

  const autoplayRef = useRef(Autoplay({ delay: 5000, stopOnInteraction: false }));
  const carouselRootOpts = useMemo(() => ({ align: "start" as const, loop: true }), []);

  const heroSlides = useMemo(() =>
    slidesFromDb && slidesFromDb.length > 0 ? slidesFromDb : [DEFAULT_SLIDE],
    [slidesFromDb]
  );

  useEffect(() => {
    const delay = heroSlides[0]?.duration ?? 5000;
    if (autoplayRef.current?.destroy) {
      try {
        autoplayRef.current.destroy();
      } catch {
        // Ignore plugin teardown failures so the hero can continue rendering.
      }
    }
    autoplayRef.current = Autoplay({ delay, stopOnInteraction: false });
    return () => {
      if (autoplayRef.current?.destroy) {
        try {
          autoplayRef.current.destroy();
        } catch {
          // Ignore plugin teardown failures during unmount.
        }
      }
    };
  }, [heroSlides]);

  return (
    <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden bg-primary">
      <Carousel opts={carouselRootOpts} plugins={autoplayRef.current ? [autoplayRef.current] : undefined} className="w-full h-full">
        <CarouselContent className="h-screen">
          {heroSlides.map((slide, index) => (
            <HeroSlide key={slide.id} slide={slide} isPrimary={index === 0} />
          ))}
        </CarouselContent>
      </Carousel>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce z-20" aria-hidden>
        <div className="w-6 h-10 border-2 border-card/50 rounded-full flex items-start justify-center p-2">
          <div className="w-1 h-3 bg-card/50 rounded-full" />
        </div>
      </div>
    </section>
  );
}
