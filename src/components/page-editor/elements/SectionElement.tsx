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
  // Individual selectors: component re-renders only when these specific
  // fields change, not on every unrelated store mutation (zoom, isSaving…).
  const selectedElementId = useEditorStore(s => s.selectedElementId);
  const hoveredElementId  = useEditorStore(s => s.hoveredElementId);
  const selectElement     = useEditorStore(s => s.selectElement);
  const setHoveredElement = useEditorStore(s => s.setHoveredElement);
  
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
    <section style={style} className="w-full px-4 md:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto">
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
            <div className="border-2 border-dashed border-border rounded-lg p-4 md:p-8 text-center text-muted-foreground">
              Drop components here
            </div>
          )
        )}
      </div>
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
