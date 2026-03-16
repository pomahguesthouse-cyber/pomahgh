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
        "relative group transition-all duration-200",
        isDragging && "opacity-40 z-50 scale-[1.02] shadow-2xl",
        isSelected && "ring-2 ring-blue-500 ring-offset-2 rounded-md",
        isHovered && !isSelected && "ring-1 ring-blue-400/50 ring-offset-1 rounded-md"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {/* Drag Handle - Wix style with animation */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 transition-all duration-200 cursor-grab active:cursor-grabbing z-10 hover:scale-110",
          (isSelected || isHovered) && "opacity-100"
        )}
      >
        <div className="bg-blue-500 text-white p-2 rounded-lg shadow-lg hover:bg-blue-600 transition-colors">
          <GripVertical className="h-4 w-4" />
        </div>
      </div>

      {/* Action Buttons with animation */}
      {isSelected && (
        <div className="absolute -top-10 right-0 flex items-center gap-1 z-20 animate-in slide-in-from-top-2 fade-in duration-150">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDuplicate}
            className="h-8 w-8 p-0 shadow-md hover:shadow-lg transition-shadow"
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            className="h-8 w-8 p-0 shadow-md hover:shadow-lg transition-shadow"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Selection indicator dot */}
      {isSelected && (
        <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full shadow-md animate-pulse" />
      )}

      {children}
    </div>
  );
}
