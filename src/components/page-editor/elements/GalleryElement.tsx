import { ElementWrapper } from "./ElementWrapper";
import { EditorElement } from "@/stores/editorStore";
import { cn } from "@/lib/utils";
import { Image as ImageIcon } from "lucide-react";

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
  const { images = [] } = element.props;
  const { columns = 3, gap = "16px", marginTop, marginBottom } = element.styles;

  const style = {
    gap,
    marginTop,
    marginBottom,
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
  };

  const galleryContent = (
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

  if (isPreview) {
    return galleryContent;
  }

  return (
    <ElementWrapper
      id={element.id}
      isSelected={isSelected}
      isHovered={isHovered}
      onSelect={onSelect}
      onHover={onHover}
    >
      {galleryContent}
    </ElementWrapper>
  );
}
