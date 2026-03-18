import { ElementWrapper } from "./ElementWrapper";
import { EditorElement } from "@/stores/editorStore";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";

type IconComponentType = React.ComponentType<React.SVGProps<SVGSVGElement>>;
const iconRegistry = LucideIcons as unknown as Record<string, IconComponentType>;

interface IconElementProps {
  element: EditorElement;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
  isPreview?: boolean;
}

export function IconElement({
  element,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  isPreview = false,
}: IconElementProps) {
  const { iconName = "Star", iconSize = 48, iconColor = "#0f172a" } = element.props;
  const { textAlign, marginTop, marginBottom } = element.styles;

  const IconComponent = iconRegistry[String(iconName)] || LucideIcons.Star;

  const style: React.CSSProperties = { marginTop, marginBottom };

  const iconContent = (
    <div style={style} className={cn("flex", {
      "justify-start": textAlign === "left",
      "justify-center": textAlign === "center" || !textAlign,
      "justify-end": textAlign === "right",
    })}>
      <IconComponent style={{ width: iconSize, height: iconSize, color: iconColor }} />
    </div>
  );

  if (isPreview) return iconContent;

  return (
    <ElementWrapper
      id={element.id}
      isSelected={isSelected}
      isHovered={isHovered}
      onSelect={onSelect}
      onHover={onHover}
    >
      {iconContent}
    </ElementWrapper>
  );
}
