import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useState } from "react";
import { useEditorStore, EditorElement } from "@/stores/editorStore";
import { ElementRenderer } from "./elements/ElementRenderer";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus } from "lucide-react";

export function createNewElement(type: string): EditorElement {
  const id = `${type}-${Date.now()}`;
  const baseElement: EditorElement = {
    id,
    type: type as EditorElement["type"],
    props: {},
    styles: {},
  };

  switch (type) {
    case "heading":
      return { ...baseElement, props: { level: "h2", content: "New Heading" } };
    case "paragraph":
      return { ...baseElement, props: { content: "Add your text here..." } };
    case "image":
      return { ...baseElement, props: { src: "", alt: "Image" }, styles: { width: "100%" } };
    case "button":
      return { ...baseElement, props: { label: "Click Me", url: "#", variant: "default" } };
    case "spacer":
      return { ...baseElement, styles: { minHeight: "40px" } };
    case "divider":
      return { ...baseElement, styles: { marginTop: "16px", marginBottom: "16px" } };
    case "section":
      return { ...baseElement, children: [], styles: { paddingTop: "40px", paddingBottom: "40px" } };
    case "container":
      return { ...baseElement, children: [], props: { direction: "column" }, styles: { gap: "16px" } };
    case "gallery":
      return { ...baseElement, props: { images: [] }, styles: { columns: 3, gap: "16px" } };
    case "html":
      return { ...baseElement, props: { html: "" } };
    default:
      return baseElement;
  }
}

// Droppable empty canvas zone
function EmptyCanvasDropZone() {
  const { setNodeRef, isOver } = useDroppable({
    id: "canvas-drop-zone",
  });

  const { addElement, saveToHistory } = useEditorStore();

  const handleQuickAdd = (type: string) => {
    const newElement = createNewElement(type);
    saveToHistory();
    addElement(newElement);
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed rounded-lg transition-all",
        isOver ? "border-primary bg-primary/10" : "border-border"
      )}
    >
      <div className="text-center text-muted-foreground p-8">
        <p className="text-lg font-medium mb-2">Start Building</p>
        <p className="text-sm mb-6">Drag components from the left panel or click below to add</p>
        
        <div className="flex flex-wrap justify-center gap-2 max-w-md">
          {[
            { type: "section", label: "Section" },
            { type: "heading", label: "Heading" },
            { type: "paragraph", label: "Paragraph" },
            { type: "image", label: "Image" },
            { type: "button", label: "Button" },
          ].map((item) => (
            <button
              key={item.type}
              onClick={() => handleQuickAdd(item.type)}
              className="flex items-center gap-1 px-3 py-2 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors"
            >
              <Plus className="h-3 w-3" />
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Droppable zone at the end of elements list
function CanvasEndDropZone() {
  const { setNodeRef, isOver } = useDroppable({
    id: "canvas-end-zone",
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[100px] border-2 border-dashed rounded-lg transition-all flex items-center justify-center",
        isOver ? "border-primary bg-primary/10" : "border-transparent hover:border-border"
      )}
    >
      <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
        Drop here to add at the end
      </span>
    </div>
  );
}

export function EditorCanvas() {
  const {
    elements,
    setElements,
    addElement,
    selectedElementId,
    hoveredElementId,
    selectElement,
    setHoveredElement,
    viewMode,
    setIsDragging,
    saveToHistory,
  } = useEditorStore();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setIsDragging(true);
    
    if (String(active.id).startsWith("library-")) {
      const type = active.data.current?.type;
      setActiveType(type);
      setActiveId(null);
    } else {
      setActiveId(String(active.id));
      setActiveType(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setIsDragging(false);
    setActiveId(null);
    setActiveType(null);

    if (!over) return;

    // New element from library
    if (String(active.id).startsWith("library-")) {
      const type = active.data.current?.type;
      const newElement = createNewElement(type);
      
      saveToHistory();
      
      // Handle drop on empty canvas or end zone
      if (over.id === "canvas-drop-zone" || over.id === "canvas-end-zone") {
        addElement(newElement);
      } else {
        // Find insert index
        const overIndex = elements.findIndex((el) => el.id === over.id);
        if (overIndex >= 0) {
          addElement(newElement, undefined, overIndex);
        } else {
          addElement(newElement);
        }
      }
      return;
    }

    // Reorder existing elements
    if (active.id !== over.id) {
      const oldIndex = elements.findIndex((el) => el.id === active.id);
      const newIndex = elements.findIndex((el) => el.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        saveToHistory();
        setElements(arrayMove(elements, oldIndex, newIndex));
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Could add drop preview logic here
  };

  const handleCanvasClick = () => {
    selectElement(null);
  };

  const getCanvasWidth = () => {
    switch (viewMode) {
      case "mobile":
        return "375px";
      case "tablet":
        return "768px";
      default:
        return "100%";
    }
  };

  return (
    <div className="flex-1 bg-muted/30 overflow-hidden flex flex-col">
      <ScrollArea className="flex-1">
        <div className="p-8 min-h-full flex justify-center">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
          >
            <div
              onClick={handleCanvasClick}
              style={{ width: getCanvasWidth(), maxWidth: "100%" }}
              className={cn(
                "bg-background shadow-lg rounded-lg min-h-[600px] transition-all",
                viewMode !== "desktop" && "mx-auto"
              )}
            >
              <div className="p-6">
                {elements.length > 0 ? (
                  <SortableContext
                    items={elements.map((el) => el.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-4 group">
                      {elements.map((element) => (
                        <ElementRenderer
                          key={element.id}
                          element={element}
                          isSelected={selectedElementId === element.id}
                          isHovered={hoveredElementId === element.id}
                          onSelect={() => selectElement(element.id)}
                          onHover={(hover) => setHoveredElement(hover ? element.id : null)}
                        />
                      ))}
                      <CanvasEndDropZone />
                    </div>
                  </SortableContext>
                ) : (
                  <EmptyCanvasDropZone />
                )}
              </div>
            </div>

            <DragOverlay>
              {activeType && (
                <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg">
                  + Add {activeType}
                </div>
              )}
              {activeId && (
                <div className="bg-background border border-primary rounded-lg shadow-lg p-4 opacity-80">
                  Moving element...
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      </ScrollArea>
    </div>
  );
}
