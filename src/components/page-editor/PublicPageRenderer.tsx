import { EditorElement } from "@/stores/editorStore";
import { ElementRenderer } from "./elements/ElementRenderer";

interface PublicPageRendererProps {
  elements: EditorElement[];
}

export function PublicPageRenderer({ elements }: PublicPageRendererProps) {
  if (!elements || elements.length === 0) return null;

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      {elements.map((element) => (
        <ElementRenderer
          key={element.id}
          element={element}
          isSelected={false}
          isHovered={false}
          onSelect={() => {}}
          onHover={() => {}}
          isPreview={true}
        />
      ))}
    </div>
  );
}
