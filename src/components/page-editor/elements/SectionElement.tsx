import { ElementWrapper } from "./ElementWrapper";
import { EditorElement, useEditorStore } from "@/stores/editorStore";
import { ElementRenderer } from "./ElementRenderer";

interface SectionElementProps {
  element: EditorElement;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
  isPreview?: boolean;
}

export function SectionElement({
  element,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  isPreview = false,
}: SectionElementProps) {
  const { selectedElementId, hoveredElementId, selectElement, setHoveredElement } = useEditorStore();
  
  const {
    backgroundColor,
    paddingTop = "40px",
    paddingBottom = "40px",
    paddingLeft = "20px",
    paddingRight = "20px",
    minHeight = "100px",
  } = element.styles;

  const style = {
    backgroundColor,
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight,
    minHeight,
  };

  const children = element.children || [];

  const sectionContent = (
    <section style={style} className="w-full">
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
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center text-muted-foreground">
            Drop components here
          </div>
        )
      )}
    </section>
  );

  if (isPreview) {
    return sectionContent;
  }

  return (
    <ElementWrapper
      id={element.id}
      isSelected={isSelected}
      isHovered={isHovered}
      onSelect={onSelect}
      onHover={onHover}
    >
      {sectionContent}
    </ElementWrapper>
  );
}
