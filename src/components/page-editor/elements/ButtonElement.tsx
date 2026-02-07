import { ElementWrapper } from "./ElementWrapper";
import { EditorElement } from "@/stores/editorStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ButtonElementProps {
  element: EditorElement;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
  isPreview?: boolean;
}

export function ButtonElement({
  element,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  isPreview = false,
}: ButtonElementProps) {
  const { label = "Click Me", url = "#", variant = "default" } = element.props;
  const { textAlign, marginTop, marginBottom, paddingLeft, paddingRight } = element.styles;

  const style = {
    marginTop,
    marginBottom,
    paddingLeft,
    paddingRight,
  };

  const buttonContent = (
    <div style={style} className={cn("flex", {
      "justify-start": textAlign === "left",
      "justify-center": textAlign === "center" || !textAlign,
      "justify-end": textAlign === "right",
    })}>
      <Button
        variant={variant as "default" | "secondary" | "outline" | "ghost" | "destructive" | "link"}
        onClick={(e) => {
          if (isPreview && url) {
            window.open(url, "_blank");
          } else {
            e.preventDefault();
          }
        }}
        className="cursor-pointer"
      >
        {label}
      </Button>
    </div>
  );

  if (isPreview) {
    return buttonContent;
  }

  return (
    <ElementWrapper
      id={element.id}
      isSelected={isSelected}
      isHovered={isHovered}
      onSelect={onSelect}
      onHover={onHover}
    >
      {buttonContent}
    </ElementWrapper>
  );
}
