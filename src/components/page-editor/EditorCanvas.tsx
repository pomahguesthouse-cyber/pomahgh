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
import { useEditorStore, EditorElement } from "@/stores/editorStore";
import { ElementRenderer } from "./elements/ElementRenderer";
import { PagePreview } from "./PagePreview";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, GripVertical } from "lucide-react";

function createNewElement(type: string): EditorElement {
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
    case "video":
      return { ...baseElement, props: { videoUrl: "" }, styles: { width: "100%" } };
    case "icon":
      return { ...baseElement, props: { iconName: "Star", iconSize: 48, iconColor: "#0f172a" }, styles: { textAlign: "center" } };
    case "social-links":
      return { ...baseElement, props: { links: [{ platform: "instagram", url: "#" }, { platform: "facebook", url: "#" }, { platform: "twitter", url: "#" }], iconSize: 24, iconColor: "#64748b" }, styles: { textAlign: "center" } };
    case "whatsapp-button":
      return { ...baseElement, props: { phoneNumber: "", message: "Halo, saya ingin bertanya...", label: "Chat via WhatsApp" }, styles: { textAlign: "center" } };
    case "map-embed":
      return { ...baseElement, props: { embedUrl: "" }, styles: { width: "100%", minHeight: "400px" } };
    case "hero-slider":
      return {
        ...baseElement,
        props: {
          height: "500px",
          autoPlay: true,
          autoPlayInterval: 5000,
          showArrows: true,
          showDots: true,
          overlayColor: "rgba(0,0,0,0.5)",
          headingColor: "#ffffff",
          subheadingColor: "#e0e0e0",
          ctaBgColor: "#e11d48",
          slides: [
            {
              id: "slide-1",
              imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920",
              headline: "Welcome to Our Hotel",
              subheadline: "Experience luxury and comfort",
              ctaText: "Book Now",
              ctaUrl: "#booking",
            },
            {
              id: "slide-2",
              imageUrl: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1920",
              headline: "Your Perfect Getaway",
              subheadline: "Discover paradise",
              ctaText: "View Rooms",
              ctaUrl: "#rooms",
            },
          ],
        },
        styles: { textAlign: "center" },
      };
    default:
      return baseElement;
  }
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
      const newElement = createNewElement(type);
      
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
                className="w-full max-w-4xl min-h-[600px] bg-white rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center transition-all hover:border-primary/50"
                onClick={handleCanvasClick}
              >
                <div className="text-center p-8">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Plus className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Start Building Your Page</h3>
                  <p className="text-muted-foreground mb-4">Click any element from the left panel or choose a section template to get started</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">Drag & Drop</span>
                    <span className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm">Click to Add</span>
                    <span className="px-3 py-1 bg-accent text-accent-foreground rounded-full text-sm">Templates</span>
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
