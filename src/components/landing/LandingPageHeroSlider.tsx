import { useState, useEffect, useCallback } from "react";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HeroSlide {
  id: string;
  image_url: string;
  alt_text: string;
}

interface LandingPageHeroSliderProps {
  slides: HeroSlide[];
  headline: string;
  subheadline?: string | null;
  ctaButton?: React.ReactNode;
  autoplayInterval?: number;
}

export function LandingPageHeroSlider({
  slides,
  headline,
  subheadline,
  ctaButton,
  autoplayInterval = 5000,
}: LandingPageHeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Autoplay
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(goToNext, autoplayInterval);
    return () => clearInterval(timer);
  }, [slides.length, autoplayInterval, goToNext]);

  if (slides.length === 0) {
    return (
      <section className="relative min-h-[60vh] flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
        <div className="relative z-10 container mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4 text-foreground">
            {headline}
          </h1>
          {subheadline && (
            <h2 className="text-lg md:text-xl mb-8 max-w-2xl mx-auto text-muted-foreground">
              {subheadline}
            </h2>
          )}
          {ctaButton}
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
      {/* Slides */}
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            index === currentIndex ? "opacity-100" : "opacity-0"
          )}
        >
          <OptimizedImage
            src={slide.image_url}
            alt={slide.alt_text || headline}
            className="w-full h-full object-cover"
            context="landing"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-background" />
        </div>
      ))}

      {/* Content overlay */}
      <div className="relative z-10 container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl md:text-5xl font-bold mb-4 text-white">
          {headline}
        </h1>
        {subheadline && (
          <h2 className="text-lg md:text-xl mb-8 max-w-2xl mx-auto text-white/90">
            {subheadline}
          </h2>
        )}
        {ctaButton}
      </div>

      {/* Navigation arrows */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={goToPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
            aria-label="Next slide"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Dots indicator */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-all",
                index === currentIndex
                  ? "bg-white w-6"
                  : "bg-white/50 hover:bg-white/75"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
