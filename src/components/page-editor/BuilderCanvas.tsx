import { useState, useCallback, memo } from "react";
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
import { useEditorStore } from "@/stores/editorStore";
import { ElementRenderer } from "./elements/ElementRenderer";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Plus, GripVertical, Grid3X3, Ruler, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { createElement } from "@/utils/elementFactory";

const RULER_SIZE = 24;
const GRID_SIZE = 20;

interface RulerMarkProps {
  size: number;
  count: number;
  horizontal?: boolean;
}

const RulerMark = memo(function RulerMark({ size, count, horizontal }: RulerMarkProps) {
  const marks = [];
  for (let i = 0; i <= count; i++) {
    const position = (i / count) * size;
    const isMainMark = i % 10 === 0;
    marks.push(
      <div
        key={i}
        className={cn(
          "absolute bg-muted-foreground/30",
          horizontal
            ? `bottom-0 left-0 w-px ${isMainMark ? "h-3" : "h-1.5"}`
            : `right-0 top-0 h-px ${isMainMark ? "w-3" : "w-1.5"}`
        )}
        style={horizontal ? { left: `${position}px` } : { top: `${position}px` }}
      >
        {isMainMark && (
          <span
            className={cn(
              "absolute text-[8px] text-muted-foreground/60",
              horizontal ? "-top-2 left-0.5" : "top-0.5 -left-3"
            )}
          >
            {i}
          </span>
        )}
      </div>
    );
  }
  return <>{marks}</>;
});

export function BuilderCanvas() {
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
    zoom,
    showGrid,
    setShowGrid,
    showRulers,
    setShowRulers,
  } = useEditorStore();

  const safeElements = Array.isArray(elements) ? elements : [];

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [showCanvasSettings, setShowCanvasSettings] = useState(false);

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

    if (String(active.id).startsWith("library-")) {
      const type = active.data.current?.type;
      const newElement = createElement(type);

      saveToHistory();

      const overIndex = safeElements.findIndex((el) => el.id === over.id);
      if (overIndex >= 0) {
        addElement(newElement, undefined, overIndex);
      } else {
        addElement(newElement);
      }
      return;
    }

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

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      selectElement(null);
    }
  };

  const getCanvasWidth = () => {
    switch (viewMode) {
      case "mobile":
        return 375;
      case "tablet":
        return 768;
      default:
        return 1200;
    }
  };

  const canvasWidth = getCanvasWidth();
  const scaledWidth = (canvasWidth * zoom) / 100;

  return (
    <div className="flex-1 bg-[#e5e5e5] overflow-hidden flex flex-col relative">
      {/* Canvas Controls Bar */}
      <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-background/95 backdrop-blur border border-border rounded-lg shadow-sm p-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showRulers ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowRulers(!showRulers)}
              className="h-7 w-7 p-0"
            >
              <Ruler className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle Rulers</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showGrid ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowGrid(!showGrid)}
              className="h-7 w-7 p-0"
            >
              <Grid3X3 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle Grid</TooltipContent>
        </Tooltip>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-8 min-h-full flex justify-center">
          <div
            className="relative"
            style={{
              width: showRulers ? scaledWidth + RULER_SIZE : scaledWidth,
              height: "100%",
            }}
          >
            {/* Horizontal Ruler */}
            {showRulers && (
              <div
                className="sticky top-0 z-10 bg-muted/50 border-b border-border"
                style={{
                  height: `${RULER_SIZE}px`,
                  marginLeft: `${RULER_SIZE}px`,
                }}
              >
                <div
                  className="relative h-full"
                  style={{ width: `${scaledWidth}px` }}
                >
                  <RulerMark size={scaledWidth} count={canvasWidth / 50} horizontal />
                </div>
              </div>
            )}

            <div className="flex">
              {/* Vertical Ruler */}
              {showRulers && (
                <div
                  className="sticky left-0 z-10 bg-muted/50 border-r border-border"
                  style={{ width: `${RULER_SIZE}px` }}
                >
                  <div
                    className="relative h-full"
                    style={{ height: `${Math.max(800, scaledWidth * 0.6)}px` }}
                  >
                    <RulerMark size={Math.max(800, scaledWidth * 0.6)} count={20} />
                  </div>
                </div>
              )}

              {/* Main Canvas */}
              <div className="flex-1 flex flex-col">
                {safeElements.length === 0 ? (
                  <div
                    className="relative bg-white shadow-lg min-h-[600px]"
                    style={{
                      width: `${scaledWidth}px`,
                      transform: `scale(1)`,
                      transformOrigin: "top left",
                    }}
                    onClick={handleCanvasClick}
                  >
                    {/* Empty State */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div
                        className="absolute inset-0 opacity-[0.03]"
                        style={{
                          backgroundImage: `radial-gradient(circle at 1px 1px, #000 1px, transparent 0)`,
                          backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
                        }}
                      />

                      <div className="relative z-10 text-center p-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                          <Plus className="h-10 w-10 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-2">
                          Start Building Your Page
                        </h3>
                        <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                          Click any element from the left panel or choose a template to get started.
                        </p>

                        {/* Quick action buttons */}
                        <div className="flex flex-wrap gap-2 justify-center mb-6">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addElement(createElement("hero-slider"));
                            }}
                            className="px-4 py-2 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 transition-colors shadow-md"
                          >
                            + Hero Slider
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addElement(createElement("section"));
                            }}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors shadow-md"
                          >
                            + Section
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addElement(createElement("map-embed"));
                            }}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors shadow-md"
                          >
                            + Map
                          </button>
                        </div>

                        {/* Keyboard shortcuts */}
                        <div className="flex flex-wrap gap-2 justify-center text-xs text-muted-foreground">
                          <span className="px-2 py-1 bg-muted rounded">Ctrl+Z Undo</span>
                          <span className="px-2 py-1 bg-muted rounded">Del Delete</span>
                          <span className="px-2 py-1 bg-muted rounded">D Duplicate</span>
                        </div>
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
                      className={cn(
                        "bg-white shadow-lg min-h-[600px] transition-all",
                        viewMode !== "desktop" && "mx-auto"
                      )}
                      style={{
                        width: `${scaledWidth}px`,
                      }}
                      onClick={handleCanvasClick}
                    >
                      {/* Grid Overlay */}
                      {showGrid && (
                        <div
                          className="absolute inset-0 pointer-events-none opacity-[0.03]"
                          style={{
                            backgroundImage: `radial-gradient(circle at 1px 1px, #000 1px, transparent 0)`,
                            backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
                          }}
                        />
                      )}

                      <div className="relative p-6">
                        <SortableContext
                          items={safeElements.map((el) => el.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-0">
                            {safeElements.map((element, index) => (
                              <div key={element.id} className="relative group/sort">
                                {/* Drop zone indicator */}
                                <div className="absolute -top-1 left-0 right-0 h-1 bg-transparent hover:bg-blue-400 transition-colors z-10 rounded-t" />

                                <ElementRenderer
                                  element={element}
                                  isSelected={selectedElementId === element.id}
                                  isHovered={hoveredElementId === element.id}
                                  onSelect={() => selectElement(element.id)}
                                  onHover={(hover) =>
                                    setHoveredElement(hover ? element.id : null)
                                  }
                                />

                                {/* Drop zone indicator */}
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
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
