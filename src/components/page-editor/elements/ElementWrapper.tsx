import { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { GripVertical, Trash2, Copy, Settings, MousePointer2 } from "lucide-react";
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
  const { removeElement, duplicateElement, saveToHistory, setShowLayerPanel, setShowPropertiesPanel } = useEditorStore();
  
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

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    setShowLayerPanel(false);
    setShowPropertiesPanel(true);
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
      {/* Wix-style Toolbar - Shows on Selection */}
      {isSelected && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1 z-30 animate-in slide-in-from-top-2 fade-in duration-150">
          {/* Element Type Label */}
          <div className="bg-blue-600 text-white px-3 py-1.5 rounded-t-lg text-sm font-medium flex items-center gap-2 shadow-lg">
            <MousePointer2 className="h-3 w-3" />
            <span className="capitalize">{id.replace(/-/g, ' ').split(' ').pop() || 'Element'}</span>
          </div>
          
          {/* Action Buttons */}
          <div className="bg-gray-900 text-white px-2 py-1.5 rounded-lg flex items-center gap-1 shadow-xl">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              className="h-7 px-2 text-white hover:bg-white/20"
              title="Edit Properties"
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
            <div className="w-px h-4 bg-white/20" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDuplicate}
              className="h-7 px-2 text-white hover:bg-white/20"
              title="Duplicate (D)"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/20"
              title="Delete (Del)"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          
          {/* Connection line to element */}
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-blue-500" />
        </div>
      )}

      {/* Drag Handle - Shows on Hover */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 transition-all duration-200 cursor-grab active:cursor-grabbing z-20 hover:scale-110",
          (isSelected || isHovered) && "opacity-100"
        )}
      >
        <div className="bg-blue-500 text-white p-2 rounded-lg shadow-lg hover:bg-blue-600 transition-colors">
          <GripVertical className="h-4 w-4" />
        </div>
      </div>

      {/* Corner indicators for selected elements */}
      {isSelected && (
        <>
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full shadow-md z-20" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full shadow-md z-20" />
          <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full shadow-md z-20" />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full shadow-md z-20" />
        </>
      )}

      {children}
    </div>
  );
}
