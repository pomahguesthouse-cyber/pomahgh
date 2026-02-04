import { ElementWrapper } from "./ElementWrapper";
import { EditorElement, useEditorStore } from "@/stores/editorStore";
import { ElementRenderer } from "./ElementRenderer";
import { cn } from "@/lib/utils";

interface ContainerElementProps {
  element: EditorElement;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
  isPreview?: boolean;
}

export function ContainerElement({
  element,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  isPreview = false,
}: ContainerElementProps) {
  const { selectedElementId, hoveredElementId, selectElement, setHoveredElement } = useEditorStore();
  
  const {
    backgroundColor,
    paddingTop = "20px",
    paddingBottom = "20px",
    paddingLeft = "20px",
    paddingRight = "20px",
    marginTop,
    marginBottom,
    borderRadius,
    gap = "16px",
  } = element.styles;

  const { direction = "column" } = element.props;

  const style = {
    backgroundColor,
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight,
    marginTop,
    marginBottom,
    borderRadius,
    gap,
  };

  const children = element.children || [];

  const containerContent = (
    <div
      style={style}
      className={cn(
        "flex w-full",
        direction === "row" ? "flex-row" : "flex-col"
      )}
    >
      {children.length > 0 ? (
        children.map((child) => (
          <ElementRenderer
            key={child.id}
            element={child}
            isSelected={selectedElementId === child.id}
            isHovered={hoveredElementId === child.id}
            onSelect={() => selectElement(child.id)}
            onHover={(hover) => setHoveredElement(hover ? child.id : null)}
            isPreview={isPreview}
          />
        ))
      ) : (
        !isPreview && (
          <div className="border-2 border-dashed border-border rounded-lg p-4 text-center text-muted-foreground text-sm">
            Drop components here
          </div>
        )
      )}
    </div>
  );

  if (isPreview) {
    return containerContent;
  }

  return (
    <ElementWrapper
      id={element.id}
      isSelected={isSelected}
      isHovered={isHovered}
      onSelect={onSelect}
      onHover={onHover}
    >
      {containerContent}
    </ElementWrapper>
  );
}
