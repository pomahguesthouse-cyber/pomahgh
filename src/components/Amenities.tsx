import * as Icons from "lucide-react";
import { useFacilities } from "@/hooks/useFacilities";
import { useFacilityHeroSlides } from "@/hooks/useFacilityHeroSlides";
import { motion } from "framer-motion";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import React, { useState, useMemo } from "react";
import { OptimizedImage } from "@/components/ui/optimized-image";

// ---------- FacilityCard (modular) ----------
export const FacilityCard = ({
  icon,
  title,
  description
}: {
  icon: string;
  title: string;
  description: string;
}) => {
  const IconComponent = (Icons as Record<string, React.ComponentType<{ className?: string }>>)[icon] || Icons.Circle;
  return (
    <div className="flex flex-col items-center text-center p-3 sm:p-4 md:p-6 rounded-lg bg-card hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full bg-primary/10 mb-2 sm:mb-3 md:mb-4">
        <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 text-primary" />
      </div>
      <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-foreground mb-1 sm:mb-2">{title}</h3>
      <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
};

// ---------- Skeleton Card ----------
export const FacilitySkeleton = () => (
  <div className="animate-pulse p-6 rounded-lg bg-card">
    <div className="w-14 h-14 bg-primary/10 rounded-full mx-auto mb-4" />
    <div className="h-4 bg-muted rounded w-3/4 mx-auto mb-3" />
    <div className="h-3 bg-muted rounded w-5/6 mx-auto" />
  </div>
);

// ---------- FacilitiesHero Component ----------
const FacilitiesHero = () => {
  const { data: slides, isLoading } = useFacilityHeroSlides();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [api, setApi] = useState<any>(null);

  const autoplayPlugin = useMemo(() => {
    return Autoplay({
      delay: 4000,
      stopOnInteraction: false
    });
  }, []);

  React.useEffect(() => {
    if (!api) return;
    const onSelect = () => {
      setCurrentSlide(api.selectedScrollSnap());
    };
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  if (isLoading || !slides || slides.length === 0) return null;

  return (
    <div className="relative mb-12 w-full overflow-hidden">
      <Carousel opts={{ loop: true }} plugins={[autoplayPlugin]} className="w-full" setApi={setApi}>
        <CarouselContent>
          {slides.map(slide => (
            <CarouselItem key={slide.id}>
              <div className="relative w-full overflow-hidden">
                <OptimizedImage 
                  src={slide.image_url} 
                  alt={slide.title || "Facility"} 
                  width={1200} 
                  height={600} 
                  priority={slides.indexOf(slide) === 0} 
                  placeholder="blur" 
                  className="w-full aspect-[2/1]" 
                />
                
                {(slide.title || slide.subtitle) && (
                  <div className="absolute inset-0 flex flex-col justify-center items-center text-center px-4">
                    {slide.title && (
                      <motion.h3 
                        initial={{ opacity: 0, y: 20 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ duration: 0.6 }} 
                        className="text-3xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg"
                      >
                        {slide.title}
                      </motion.h3>
                    )}
                    {slide.subtitle && (
                      <motion.p 
                        initial={{ opacity: 0, y: 20 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ duration: 0.6, delay: 0.2 }} 
                        className="text-lg md:text-xl text-white/90 drop-shadow-lg"
                      >
                        {slide.subtitle}
                      </motion.p>
                    )}
                  </div>
                )}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        
        <CarouselPrevious className="left-4" />
        <CarouselNext className="right-4" />
      </Carousel>
      
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, index) => (
          <button 
            key={index} 
            className={`w-2 h-2 rounded-full transition-all ${index === currentSlide ? "bg-white w-8" : "bg-white/50"}`} 
            onClick={() => {}} 
          />
        ))}
      </div>
    </div>
  );
};

// ---------- Main Amenities Component ----------
export const Amenities = () => {
  const { data: facilities, isLoading, error } = useFacilities();

  const title = "Facilities";
  const description = "Indulge in world-class facilities designed to elevate your stay and create unforgettable memories.";

  const renderSkeletons = () => (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
      {[1, 2, 3].map(i => <FacilitySkeleton key={i} />)}
    </div>
  );

  if (isLoading) {
    return (
      <section id="amenities" className="py-20 px-4 bg-background">
        <div className="container mx-auto">{renderSkeletons()}</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-20 px-4 bg-background">
        <div className="text-center text-red-500 font-medium">Failed to load facilities. Please try again later.</div>
      </section>
    );
  }

  if (!facilities || facilities.length === 0) return null;

  return (
    <section id="amenities" className="pt-0 pb-20 bg-background">
      <FacilitiesHero />
      <div className="container mx-auto px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6 }} 
          viewport={{ once: true }} 
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold mb-3 sm:mb-4 font-sans text-primary">
            {title}
          </h2>
          
          <div className="h-1 bg-primary mx-auto mb-4 sm:mb-6 border-0 border-primary w-24" />
          
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto px-4">
            {description}
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {facilities.map(item => (
            <FacilityCard key={item.id} icon={item.icon_name} title={item.title} description={item.description} />
          ))}
        </div>
      </div>
    </section>
  );
};
