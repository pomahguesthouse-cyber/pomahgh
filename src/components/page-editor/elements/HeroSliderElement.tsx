import { useState, useEffect } from "react";
import { EditorElement, useEditorStore } from "@/stores/editorStore";
import { ElementWrapper } from "./ElementWrapper";
import { ChevronLeft, ChevronRight, Dot } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeroSliderElementProps {
  element: EditorElement;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
  isPreview?: boolean;
}

export function HeroSliderElement({
  element,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  isPreview = false,
}: HeroSliderElementProps) {
  const { updateElement } = useEditorStore();
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const slides = element.props.slides || [
    {
      id: "slide-1",
      imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920",
      headline: "Welcome to Our Hotel",
      subheadline: "Experience luxury and comfort",
      ctaText: "Book Now",
      ctaUrl: "#booking",
    },
    {
      id: "slide-2", 
      imageUrl: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1920",
      headline: "Your Perfect Getaway",
      subheadline: "Discover paradise",
      ctaText: "View Rooms",
      ctaUrl: "#rooms",
    },
  ];

  const autoPlay = element.props.autoPlay !== false;
  const autoPlayInterval = element.props.autoPlayInterval || 5000;
  const showArrows = element.props.showArrows !== false;
  const showDots = element.props.showDots !== false;

  useEffect(() => {
    if (!autoPlay || isPreview === false) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, autoPlayInterval);
    
    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, slides.length, isPreview]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const goToPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const currentSlideData = slides[currentSlide] || slides[0];

  return (
    <ElementWrapper
      element={element}
      isSelected={isSelected}
      isHovered={isHovered}
      onSelect={onSelect}
      onHover={onHover}
    >
      <div
        className="relative overflow-hidden"
        style={{
          minHeight: element.props.height || "500px",
        }}
      >
        {/* Slide Background */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700"
          style={{
            backgroundImage: `url(${currentSlideData.imageUrl})`,
          }}
        >
          <div 
            className="absolute inset-0"
            style={{ backgroundColor: element.props.overlayColor || "rgba(0,0,0,0.5)" }}
          />
        </div>

        {/* Slide Content */}
        <div 
          className="relative z-10 flex flex-col items-center justify-center text-center px-4 py-16 md:py-24"
          style={{
            minHeight: element.props.height || "500px",
            paddingTop: element.styles.paddingTop || "80px",
            paddingBottom: element.styles.paddingBottom || "80px",
          }}
        >
          <h1 
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 animate-fade-in-up"
            style={{ 
              color: element.props.headingColor || "#ffffff",
              textAlign: element.styles.textAlign || "center",
            }}
          >
            {currentSlideData.headline}
          </h1>
          
          <p 
            className="text-lg md:text-xl mb-8 max-w-2xl animate-fade-in-up"
            style={{ 
              color: element.props.subheadingColor || "#e0e0e0",
              textAlign: element.styles.textAlign || "center",
            }}
          >
            {currentSlideData.subheadline}
          </p>

          {currentSlideData.ctaText && (
            <a
              href={currentSlideData.ctaUrl || "#"}
              className="inline-block px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors animate-fade-in-up"
              style={{
                backgroundColor: element.props.ctaBgColor || "#e11d48",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {currentSlideData.ctaText}
            </a>
          )}
        </div>

        {/* Navigation Arrows */}
        {showArrows && (
          <>
            <button
              onClick={goToPrev}
              onMouseDown={(e) => e.stopPropagation()}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 flex items-center justify-center bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors backdrop-blur-sm"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={goToNext}
              onMouseDown={(e) => e.stopPropagation()}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 flex items-center justify-center bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors backdrop-blur-sm"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Dot Indicators */}
        {showDots && slides.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  goToSlide(index);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className={cn(
                  "w-3 h-3 rounded-full transition-all",
                  index === currentSlide 
                    ? "bg-white scale-110" 
                    : "bg-white/50 hover:bg-white/80"
                )}
              />
            ))}
          </div>
        )}

        {/* Slide Counter */}
        {element.props.showCounter && (
          <div className="absolute top-4 right-4 z-20 px-3 py-1 bg-black/50 rounded-full text-white text-sm backdrop-blur-sm">
            {currentSlide + 1} / {slides.length}
          </div>
        )}
      </div>
    </ElementWrapper>
  );
}
