import { ElementWrapper } from "./ElementWrapper";
import { EditorElement } from "@/stores/editorStore";

interface DividerElementProps {
  element: EditorElement;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
  isPreview?: boolean;
}

export function DividerElement({
  element,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  isPreview = false,
}: DividerElementProps) {
  const { marginTop = "16px", marginBottom = "16px", color = "hsl(var(--border))" } = element.styles;

  const style = {
    marginTop,
    marginBottom,
    borderColor: color,
  };

  const dividerContent = <hr style={style} className="border-t" />;

  if (isPreview) {
    return dividerContent;
  }

  return (
    <ElementWrapper
      id={element.id}
      isSelected={isSelected}
      isHovered={isHovered}
      onSelect={onSelect}
      onHover={onHover}
    >
      {dividerContent}
    </ElementWrapper>
  );
}
