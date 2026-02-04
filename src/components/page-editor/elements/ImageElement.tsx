import { ElementWrapper } from "./ElementWrapper";
import { EditorElement } from "@/stores/editorStore";
import { cn } from "@/lib/utils";
import { Image as ImageIcon } from "lucide-react";

interface ImageElementProps {
  element: EditorElement;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
  isPreview?: boolean;
}

export function ImageElement({
  element,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  isPreview = false,
}: ImageElementProps) {
  const { src, alt = "Image" } = element.props;
  const { borderRadius, width = "100%", marginTop, marginBottom } = element.styles;

  const style = {
    borderRadius,
    width,
    marginTop,
    marginBottom,
  };

  const imageContent = src ? (
    <img
      src={src}
      alt={alt}
      style={style}
      className="object-cover"
    />
  ) : (
    <div
      style={style}
      className={cn(
        "flex flex-col items-center justify-center bg-muted border-2 border-dashed border-border rounded-lg min-h-[200px]"
      )}
    >
      <ImageIcon className="h-12 w-12 text-muted-foreground mb-2" />
      <span className="text-sm text-muted-foreground">Click to add image</span>
    </div>
  );

  if (isPreview) {
    return imageContent;
  }

  return (
    <ElementWrapper
      id={element.id}
      isSelected={isSelected}
      isHovered={isHovered}
      onSelect={onSelect}
      onHover={onHover}
    >
      {imageContent}
    </ElementWrapper>
  );
}
