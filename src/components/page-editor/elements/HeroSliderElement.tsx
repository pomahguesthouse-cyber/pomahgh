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
  const transitionEffect = element.props.transitionEffect || "fade";

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

  // Guard against empty slides array
  const currentSlideData = slides[currentSlide] ?? (slides[0] ?? { imageUrl: "", headline: "", subheadline: "", ctaText: "", ctaUrl: "" });
  
  const contentPosition = element.props.contentPosition || "center";
  const layout = element.props.layout || "full";

  const getAlignmentClass = () => {
    switch (contentPosition) {
      case "left": return "items-start text-left";
      case "right": return "items-end text-right";
      default: return "items-center text-center";
    }
  };

  const getPaddingClass = () => {
    switch (contentPosition) {
      case "left": return "justify-start pl-8 md:pl-16";
      case "right": return "justify-end pr-8 md:pr-16";
      default: return "justify-center";
    }
  };

  if (layout === "split") {
    return (
      <ElementWrapper
        id={element.id}
        isSelected={isSelected}
        isHovered={isHovered}
        onSelect={onSelect}
        onHover={onHover}
      >
        <div
          className="relative overflow-hidden grid md:grid-cols-2"
          style={{ minHeight: element.props.height || "500px" }}
        >
          {/* Content Side */}
          <div 
            className={`relative z-10 flex flex-col justify-center px-8 md:px-16 py-16 ${getAlignmentClass()}`}
          >
            <h1 
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{ color: element.props.headingColor || "#111827", fontFamily: element.props.headlineFont || undefined }}
            >
              {currentSlideData.headline}
            </h1>
            <p 
              className="text-lg md:text-xl mb-8 max-w-md"
              style={{ color: element.props.subheadingColor || "#4b5563", fontFamily: element.props.subheadlineFont || undefined }}
            >
              {currentSlideData.subheadline}
            </p>
            {currentSlideData.ctaText && (
              <a
                href={currentSlideData.ctaUrl || "#"}
                className="inline-block px-8 py-3 rounded-lg font-semibold transition-colors w-fit"
                style={{
                  backgroundColor: element.props.ctaBgColor || "#059669",
                  color: "#ffffff",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {currentSlideData.ctaText}
              </a>
            )}
          </div>
          
          {/* Image Side */}
          <div
            className="relative hidden md:block bg-cover bg-center"
            style={{ backgroundImage: `url(${currentSlideData.imageUrl})` }}
          >
            <div 
              className="absolute inset-0"
              style={{ backgroundColor: element.props.overlayColor || "rgba(0,0,0,0)" }}
            />
          </div>
          
          {/* Mobile Background */}
          <div
            className="absolute inset-0 md:hidden bg-cover bg-center -z-10"
            style={{ backgroundImage: `url(${currentSlideData.imageUrl})` }}
          >
            <div 
              className="absolute inset-0"
              style={{ backgroundColor: element.props.overlayColor || "rgba(0,0,0,0.5)" }}
            />
          </div>

          {/* Navigation */}
          {showArrows && (
            <>
              <button
                onClick={goToPrev}
                onMouseDown={(e) => e.stopPropagation()}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center bg-white/80 hover:bg-white rounded-full shadow-lg"
              >
                <ChevronLeft className="w-5 h-5 text-gray-800" />
              </button>
              <button
                onClick={goToNext}
                onMouseDown={(e) => e.stopPropagation()}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center bg-white/80 hover:bg-white rounded-full shadow-lg"
              >
                <ChevronRight className="w-5 h-5 text-gray-800" />
              </button>
            </>
          )}
          
          {element.props.showCounter && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1 bg-white/90 rounded-full text-sm shadow">
              {currentSlide + 1} / {slides.length}
            </div>
          )}
        </div>
      </ElementWrapper>
    );
  }

  return (
    <ElementWrapper
      id={element.id}
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
        {slides.map((slide: any, index: number) => {
          const isActive = index === currentSlide;
          const bgStyle: React.CSSProperties = {
            backgroundImage: `url(${slide.imageUrl || ""})`,
            ...(transitionEffect === "slide"
              ? {
                  transform: `translateX(${(index - currentSlide) * 100}%)`,
                  transition: "transform 0.7s ease-in-out",
                  position: "absolute",
                  inset: 0,
                }
              : transitionEffect === "zoom"
              ? {
                  opacity: isActive ? 1 : 0,
                  transform: isActive ? "scale(1)" : "scale(1.15)",
                  transition: "opacity 0.7s ease-in-out, transform 0.7s ease-in-out",
                  position: "absolute",
                  inset: 0,
                }
              : {
                  opacity: isActive ? 1 : 0,
                  transition: "opacity 0.7s ease-in-out",
                  position: "absolute",
                  inset: 0,
                }),
          };
          return (
            <div
              key={slide.id || index}
              className="bg-cover bg-center"
              style={bgStyle}
            >
              <div
                className="absolute inset-0"
                style={{ backgroundColor: element.props.overlayColor || "rgba(0,0,0,0.5)" }}
              />
            </div>
          );
        })}

        {/* Slide Content */}
        <div 
          className={`relative z-10 flex flex-col ${getPaddingClass()} px-4 py-16 md:py-24 h-full`}
          style={{
            minHeight: element.props.height || "500px",
            paddingTop: element.styles.paddingTop || "80px",
            paddingBottom: element.styles.paddingBottom || "80px",
          }}
        >
          <div className={`flex flex-col ${getAlignmentClass()} max-w-4xl`}>
            <h1 
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4"
              style={{ 
                color: element.props.headingColor || "#ffffff",
              }}
            >
              {currentSlideData.headline}
            </h1>
            
            <p 
              className="text-lg md:text-xl mb-8 max-w-2xl"
              style={{ 
                color: element.props.subheadingColor || "#e0e0e0",
              }}
            >
              {currentSlideData.subheadline}
            </p>

            {currentSlideData.ctaText && (
              <a
                href={currentSlideData.ctaUrl || "#"}
                className="inline-block px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
                style={{
                  backgroundColor: element.props.ctaBgColor || "#e11d48",
                  color: "#ffffff",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {currentSlideData.ctaText}
              </a>
            )}
          </div>
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
            {slides.map((_: any, index: number) => (
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
