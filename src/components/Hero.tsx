import { Button } from "@/components/ui/button";
import { useHeroSlides } from "@/hooks/useHeroSlides";
import heroImage from "@/assets/hero-guesthouse.jpg";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

export const Hero = () => {
  const { data: slides, isLoading } = useHeroSlides();

  // Use database slides if available, otherwise fallback to default
  const heroSlides = slides && slides.length > 0 
    ? slides 
    : [{
        id: 'default',
        image_url: heroImage,
        overlay_text: 'Pomah Guesthouse',
        overlay_subtext: 'Experience Tropical Paradise Where Luxury Meets Serenity',
        font_family: 'Inter',
        font_size: 'text-5xl md:text-7xl lg:text-8xl',
        font_weight: 'font-bold',
        text_color: 'text-card',
        text_align: 'center',
        duration: 5000,
        transition_effect: 'fade',
      }];

  const getTransitionClass = (effect: string) => {
    switch (effect) {
      case 'slide':
        return 'transition-transform duration-1000 ease-in-out';
      case 'zoom':
        return 'transition-all duration-1000 ease-in-out';
      case 'fade':
      default:
        return 'transition-opacity duration-1000 ease-in-out';
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
              {/* Background Image */}
              <div
                className={`absolute inset-0 bg-cover bg-center bg-no-repeat ${getTransitionClass(slide.transition_effect)}`}
                style={{ backgroundImage: `url(${slide.image_url})` }}
              >
                <div className="absolute inset-0 hero-gradient"></div>
              </div>

              {/* Content */}
              <div className={`relative z-10 text-${slide.text_align} px-4 animate-fade-in h-full flex flex-col justify-center items-${slide.text_align === 'center' ? 'center' : slide.text_align === 'right' ? 'end' : 'start'}`}>
                <h1 
                  className={`text-3xl sm:text-4xl md:text-6xl lg:text-7xl ${slide.font_weight} ${slide.text_color} mb-4 sm:mb-6 px-2`}
                  style={{ fontFamily: slide.font_family }}
                >
                  {slide.overlay_text}
                </h1>
                {slide.overlay_subtext && (
                  <p className={`text-base sm:text-lg md:text-xl lg:text-2xl ${slide.text_color}/90 mb-6 sm:mb-8 max-w-2xl px-2 ${slide.text_align === 'center' ? 'mx-auto' : ''}`}>
                    {slide.overlay_subtext}
                  </p>
                )}
                <div className={`flex flex-col sm:flex-row gap-3 sm:gap-4 px-2 ${slide.text_align === 'center' ? 'justify-center' : slide.text_align === 'right' ? 'justify-end' : 'justify-start'}`}>
                  <Button 
                    variant="hero" 
                    size="lg" 
                    className="text-sm sm:text-base md:text-lg"
                    onClick={() => document.getElementById("rooms")?.scrollIntoView({ behavior: "smooth" })}
                  >
                    Explore Rooms
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="text-sm sm:text-base md:text-lg border-card text-card hover:bg-card hover:text-primary"
                    onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
                  >
                    Contact Us
                  </Button>
                </div>
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
