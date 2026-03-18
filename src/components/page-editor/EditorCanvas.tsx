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
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useState } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { ElementRenderer } from "./elements/ElementRenderer";
import { PagePreview } from "./PagePreview";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, GripVertical } from "lucide-react";
import { createElement } from "@/utils/elementFactory";

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
  
  // Defensive check: ensure elements is always an array
  const safeElements = Array.isArray(elements) ? elements : [];

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
   const [showPreview, setShowPreview] = useState(true);

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
      const newElement = createElement(type);
      
      saveToHistory();
      
      // Find insert index
      const overIndex = safeElements.findIndex((el) => el.id === over.id);
      if (overIndex >= 0) {
        addElement(newElement, undefined, overIndex);
      } else {
        addElement(newElement);
      }
      return;
    }

    // Reorder existing elements
    if (active.id !== over.id) {
      const oldIndex = safeElements.findIndex((el) => el.id === active.id);
      const newIndex = safeElements.findIndex((el) => el.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        saveToHistory();
        setElements(arrayMove(safeElements, oldIndex, newIndex));
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
    <div className="flex-1 bg-[#f8f9fa] overflow-hidden flex flex-col relative">
      {/* Wix-style blue guidelines */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="h-full w-full relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-blue-200/50 -translate-x-1/2" />
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-8 min-h-full flex justify-center">
           {/* Show PagePreview if there are no elements in the new schema */}
            {safeElements.length === 0 ? (
              <div 
                className="w-full max-w-4xl min-h-[600px] bg-white rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center transition-all hover:border-primary/50 relative overflow-hidden"
                onClick={handleCanvasClick}
              >
                {/* Animated background pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #000 1px, transparent 0)', backgroundSize: '40px 40px' }} />
                </div>
                
                <div className="text-center p-8 relative z-10">
                  <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg transform hover:scale-110 transition-transform duration-300">
                    <Plus className="h-12 w-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">Start Building Your Page</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">Click any element from the left panel or choose a template to get started. Drag and drop to reorder.</p>
                  
                  {/* Quick action buttons */}
                  <div className="flex flex-wrap gap-3 justify-center mb-6">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        addElement(createElement("hero-slider"));
                      }}
                      className="px-4 py-2 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 transition-colors shadow-md hover:shadow-lg"
                    >
                      + Hero Slider
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        addElement(createElement("section"));
                      }}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors shadow-md hover:shadow-lg"
                    >
                      + Section
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        addElement(createElement("map-embed"));
                      }}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors shadow-md hover:shadow-lg"
                    >
                      + Map
                    </button>
                  </div>
                  
                  {/* Keyboard shortcuts hint */}
                  <div className="flex flex-wrap gap-2 justify-center text-xs text-muted-foreground">
                    <span className="px-2 py-1 bg-muted rounded">Ctrl+Z Undo</span>
                    <span className="px-2 py-1 bg-muted rounded">Del Delete</span>
                    <span className="px-2 py-1 bg-muted rounded">↑↓ Move</span>
                    <span className="px-2 py-1 bg-muted rounded">D Duplicate</span>
                  </div>
                </div>
              </div>
           ) : (
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
                    "bg-white shadow-lg rounded-lg min-h-[600px] transition-all ring-1 ring-gray-200",
                    viewMode !== "desktop" && "mx-auto"
                  )}
                >
                  <div className="p-6">
                    <SortableContext
                       items={safeElements.map((el) => el.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-0">
                         {safeElements.map((element, index) => (
                          <div key={element.id} className="relative group/sort">
                            {/* Drop indicator line before element */}
                            <div className="absolute -top-1 left-0 right-0 h-1 bg-transparent hover:bg-blue-400 transition-colors z-10 rounded-t" />
                            
                            <ElementRenderer
                              element={element}
                              isSelected={selectedElementId === element.id}
                              isHovered={hoveredElementId === element.id}
                              onSelect={() => selectElement(element.id)}
                              onHover={(hover) => setHoveredElement(hover ? element.id : null)}
                            />
                            
                            {/* Drop indicator after element */}
                            <div className="absolute -bottom-1 left-0 right-0 h-1 bg-transparent hover:bg-blue-400 transition-colors z-10 rounded-b" />
                          </div>
                        ))}
                     </div>
                    </SortableContext>
                 </div>
                </div>
  
                <DragOverlay>
                  {activeType && (
                    <div className="bg-primary text-primary-foreground px-6 py-3 rounded-lg shadow-xl flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add {activeType}
                    </div>
                  )}
                  {activeId && (
                    <div className="bg-white border-2 border-primary rounded-lg shadow-xl p-4 opacity-90">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-primary" />
                        Moving element...
                      </div>
                    </div>
                  )}
                </DragOverlay>
             </DndContext>
           )}
        </div>
      </ScrollArea>
    </div>
  );
}
