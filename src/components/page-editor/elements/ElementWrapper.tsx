import { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { GripVertical, Trash2, Copy } from "lucide-react";
import { useEditorStore } from "@/stores/editorStore";
import { Button } from "@/components/ui/button";

interface ElementWrapperProps {
  id: string;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
  children: ReactNode;
  isPreview?: boolean;
}

export function ElementWrapper({
  id,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  children,
  isPreview = false,
}: ElementWrapperProps) {
  const { removeElement, duplicateElement, saveToHistory } = useEditorStore();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: isPreview });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    saveToHistory();
    removeElement(id);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    saveToHistory();
    duplicateElement(id);
  };

  if (isPreview) {
    return <div className="relative">{children}</div>;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group transition-all",
        isDragging && "opacity-50 z-50",
        isSelected && "ring-2 ring-primary ring-offset-2",
        isHovered && !isSelected && "ring-1 ring-primary/50"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 transition-opacity cursor-grab active:cursor-grabbing z-10",
          (isSelected || isHovered) && "opacity-100"
        )}
      >
        <div className="bg-primary text-primary-foreground p-1 rounded">
          <GripVertical className="h-4 w-4" />
        </div>
      </div>

      {/* Action Buttons */}
      {isSelected && (
        <div className="absolute -top-10 right-0 flex items-center gap-1 z-20">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDuplicate}
            className="h-8 w-8 p-0"
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            className="h-8 w-8 p-0"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}

      {children}
    </div>
  );
}
