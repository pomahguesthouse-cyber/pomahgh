import { ElementWrapper } from "./ElementWrapper";
import { EditorElement } from "@/stores/editorStore";

interface SpacerElementProps {
  element: EditorElement;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
  isPreview?: boolean;
}

export function SpacerElement({
  element,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  isPreview = false,
}: SpacerElementProps) {
  const { minHeight = "40px" } = element.styles;

  const spacerContent = (
    <div
      style={{ minHeight }}
      className="w-full"
    />
  );

  if (isPreview) {
    return spacerContent;
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
        style={{ minHeight }}
        className="w-full bg-muted/30 border border-dashed border-border flex items-center justify-center"
      >
        <span className="text-xs text-muted-foreground">Spacer ({minHeight})</span>
      </div>
    </ElementWrapper>
  );
}
