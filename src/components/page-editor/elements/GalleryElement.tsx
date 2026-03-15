import { useState, useEffect, useCallback } from "react";
import { ElementWrapper } from "./ElementWrapper";
import { EditorElement } from "@/stores/editorStore";
import { Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";

interface GalleryElementProps {
  element: EditorElement;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
  isPreview?: boolean;
}

export function GalleryElement({
  element,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  isPreview = false,
}: GalleryElementProps) {
  const { images = [], galleryMode = "grid", autoPlay = true, showArrows = true, showDots = true, transitionEffect = "fade" } = element.props;
  const { columns = 3, gap = "16px", marginTop, marginBottom } = element.styles;

  const isSlider = galleryMode === "slider";

  if (isSlider) {
    return (
      <SliderGallery
        images={images}
        autoPlay={autoPlay}
        showArrows={showArrows}
        showDots={showDots}
        transitionEffect={transitionEffect}
        marginTop={marginTop}
        marginBottom={marginBottom}
        element={element}
        isSelected={isSelected}
        isHovered={isHovered}
        onSelect={onSelect}
        onHover={onHover}
        isPreview={isPreview}
      />
    );
  }

  // Grid mode
  const style = {
    gap,
    marginTop,
    marginBottom,
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
  };

  const gridContent = (
    <div style={style} className="grid w-full">
      {images.length > 0 ? (
        images.map((img: { src: string; alt: string }, index: number) => (
          <div key={index} className="aspect-square overflow-hidden rounded-lg">
            <img
              src={img.src}
              alt={img.alt || `Gallery image ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))
      ) : (
        Array.from({ length: Number(columns) }).map((_, index) => (
          <div
            key={index}
            className="aspect-square bg-muted border-2 border-dashed border-border rounded-lg flex items-center justify-center"
          >
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </div>
        ))
      )}
    </div>
  );

  if (isPreview) return gridContent;

  return (
    <ElementWrapper
      id={element.id}
      isSelected={isSelected}
      isHovered={isHovered}
      onSelect={onSelect}
      onHover={onHover}
    >
      {gridContent}
    </ElementWrapper>
  );
}

function SliderGallery({
  images,
  autoPlay,
  showArrows,
  showDots,
  marginTop,
  marginBottom,
  element,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  isPreview,
}: {
  images: { src: string; alt: string }[];
  autoPlay: boolean;
  showArrows: boolean;
  showDots: boolean;
  marginTop?: string;
  marginBottom?: string;
  element: EditorElement;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
  isPreview: boolean;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const count = images.length;

  const goNext = useCallback(() => {
    if (count === 0) return;
    setCurrentIndex((prev) => (prev + 1) % count);
  }, [count]);

  const goPrev = useCallback(() => {
    if (count === 0) return;
    setCurrentIndex((prev) => (prev - 1 + count) % count);
  }, [count]);

  useEffect(() => {
    if (!autoPlay || count <= 1) return;
    const interval = setInterval(goNext, 4000);
    return () => clearInterval(interval);
  }, [autoPlay, count, goNext]);

  const sliderContent = (
    <div style={{ marginTop, marginBottom }} className="relative w-full overflow-hidden rounded-lg">
      {count > 0 ? (
        <>
          <div className="aspect-[16/9] relative">
            {images.map((img, index) => (
              <div
                key={index}
                className="absolute inset-0 transition-opacity duration-500"
                style={{ opacity: index === currentIndex ? 1 : 0 }}
              >
                <img
                  src={img.src}
                  alt={img.alt || `Slide ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>

          {showArrows && count > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-1.5 shadow-md transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-foreground" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-1.5 shadow-md transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-foreground" />
              </button>
            </>
          )}

          {showDots && count > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => { e.stopPropagation(); setCurrentIndex(index); }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentIndex
                      ? "bg-background w-4"
                      : "bg-background/50"
                  }`}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="aspect-[16/9] bg-muted border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2">
          <ImageIcon className="h-10 w-10 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Slider Gallery — Add images in properties</span>
        </div>
      )}
    </div>
  );

  if (isPreview) return sliderContent;

  return (
    <ElementWrapper
      id={element.id}
      isSelected={isSelected}
      isHovered={isHovered}
      onSelect={onSelect}
      onHover={onHover}
    >
      {sliderContent}
    </ElementWrapper>
  );
}
