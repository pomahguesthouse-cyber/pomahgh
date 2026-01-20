import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { MapPin, Compass } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useExploreHeroSlides } from "@/hooks/explore/useExploreHeroSlides";
import { OptimizedImage } from "@/components/ui/optimized-image";

const defaultSlide = {
  id: "default",
  image_url: "https://images.unsplash.com/photo-1555899434-94d1368aa7af?w=1920&q=80",
  title: "Explore Semarang",
  subtitle: "Temukan keindahan ibukota Jawa Tengah — dari bangunan bersejarah hingga kuliner legendaris",
  show_overlay: true,
  overlay_opacity: 0.5,
  overlay_gradient_from: "#0F766E",
  overlay_gradient_to: "#000000",
  duration: 5000,
};

export const ExploreHeroSlider = () => {
  const { data: slides, isLoading } = useExploreHeroSlides();
  const autoplayRef = useRef(
    Autoplay({ delay: 5000, stopOnInteraction: false })
  );

  const displaySlides = slides && slides.length > 0 ? slides : [defaultSlide];

  // Update autoplay delay when slides change
  useEffect(() => {
    if (displaySlides.length > 0) {
      autoplayRef.current = Autoplay({
        delay: displaySlides[0]?.duration || 5000,
        stopOnInteraction: false,
      });
    }
  }, [displaySlides]);

  if (isLoading) {
    return (
      <section className="relative h-[60vh] min-h-[400px] bg-muted animate-pulse" />
    );
  }

  return (
    <section className="relative h-[60vh] min-h-[400px] overflow-hidden">
      <Carousel
        opts={{ loop: true }}
        plugins={[autoplayRef.current]}
        className="w-full h-full"
      >
        <CarouselContent className="h-full -ml-0">
          {displaySlides.map((slide, index) => (
            <CarouselItem key={slide.id} className="h-full pl-0">
              <div className="relative w-full h-[60vh] min-h-[400px] flex items-center justify-center">
                {/* Background Image */}
                <div className="absolute inset-0">
                  <OptimizedImage
                    src={slide.image_url}
                    alt={slide.title || "Explore Semarang"}
                    width={1920}
                    height={800}
                    priority={index === 0}
                    placeholder="blur"
                    className="w-full h-full"
                  />
                </div>

                {/* Gradient Overlay */}
                {slide.show_overlay && (
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(to bottom, ${slide.overlay_gradient_from}${Math.round((slide.overlay_opacity || 0.5) * 255).toString(16).padStart(2, '0')}, ${slide.overlay_gradient_to}${Math.round((slide.overlay_opacity || 0.5) * 255).toString(16).padStart(2, '0')})`,
                    }}
                  />
                )}

                {/* Content */}
                <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="flex items-center justify-center gap-2 mb-4"
                  >
                    <Compass className="h-6 w-6 text-primary" />
                    <span className="text-primary font-medium tracking-wider uppercase text-sm">
                      Discover
                    </span>
                  </motion.div>

                  <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="text-4xl md:text-6xl lg:text-7xl font-cinzel font-semibold text-white mb-6"
                  >
                    {slide.title || "Explore Semarang"}
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto"
                  >
                    {slide.subtitle || "Temukan keindahan ibukota Jawa Tengah"}
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="flex items-center justify-center gap-2 text-white/80"
                  >
                    <MapPin className="h-5 w-5" />
                    <span>Semarang, Jawa Tengah, Indonesia</span>
                  </motion.div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-6 h-10 border-2 border-white/50 rounded-full flex items-start justify-center p-2"
        >
          <div className="w-1 h-2 bg-white/70 rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
};












