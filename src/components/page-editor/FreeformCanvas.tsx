import { useState, useCallback, useRef, useMemo } from "react";
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
import { useEditorStore, EditorElement } from "@/stores/editorStore";
import { ElementRenderer } from "./elements/ElementRenderer";
import { DraggableElement } from "./elements/DraggableElement";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  Plus, 
  Grid3X3, 
  Ruler, 
  Magnet, 
  Layers, 
  ChevronDown, 
  ChevronRight,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { createElement } from "@/utils/elementFactory";

const GRID_SIZE = 20;
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;
const SNAP_THRESHOLD = 8;

interface AlignmentGuide {
  type: "horizontal" | "vertical";
  position: number;
  start: number;
  end: number;
}

export function FreeformCanvas() {
  const {
    elements,
    setElements,
    addElement,
    selectedElementId,
    selectedElementIds,
    hoveredElementId,
    selectElement,
    addToSelection,
    clearSelection,
    setHoveredElement,
    viewMode,
    setIsDragging,
    saveToHistory,
    zoom,
    showGrid,
    setShowGrid,
    showRulers,
    setShowRulers,
    snapToGrid,
    setSnapToGrid,
    snapToElements,
    setSnapToElements,
    layoutMode,
    setLayoutMode,
    updateElementPosition,
    removeElement,
    duplicateElement,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    isDragging,
  } = useEditorStore();

  const safeElements = Array.isArray(elements) ? elements : [];

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
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
  }, [setIsDragging]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setIsDragging(false);
    setActiveId(null);
    setActiveType(null);
    setAlignmentGuides([]);

    if (!over) return;

    if (String(active.id).startsWith("library-")) {
      const type = active.data.current?.type;
      const newElement = createElement(type);

      saveToHistory();

      // If dropped on canvas (not over an element)
      if (over.id === "canvas-drop-zone") {
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (canvasRect) {
          // Get drop position relative to canvas
          // For now, add at center or next position
        }
      }

      const overIndex = safeElements.findIndex((el) => el.id === over.id);
      if (overIndex >= 0) {
        addElement(newElement, undefined, overIndex);
      } else {
        addElement(newElement);
      }
      return;
    }

    // Reorder existing elements (for structured mode)
    if (active.id !== over.id && layoutMode === "structured") {
      const oldIndex = safeElements.findIndex((el) => el.id === active.id);
      const newIndex = safeElements.findIndex((el) => el.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        saveToHistory();
        setElements(arrayMove(safeElements, oldIndex, newIndex));
      }
    }
  }, [setIsDragging, saveToHistory, safeElements, addElement, setElements, layoutMode]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('[data-canvas="true"]')) {
      clearSelection();
    }
  }, [clearSelection]);

  const handleElementDragStart = useCallback(() => {
    setIsDragging(true);
  }, [setIsDragging]);

  const handleElementDragEnd = useCallback(() => {
    setIsDragging(false);
    saveToHistory();
  }, [setIsDragging, saveToHistory]);

  const handleElementPositionChange = useCallback((id: string, pos: { x: number; y: number }) => {
    updateElementPosition(id, pos);
  }, [updateElementPosition]);

  const handleElementSizeChange = useCallback((id: string, size: { width: number; height: number }) => {
    updateElementPosition(id, size);
  }, [updateElementPosition]);

  const getCanvasWidth = useCallback(() => {
    switch (viewMode) {
      case "mobile":
        return 375;
      case "tablet":
        return 768;
      default:
        return CANVAS_WIDTH;
    }
  }, [viewMode]);

  const canvasWidth = getCanvasWidth();

  // Calculate alignment guides based on other elements
  const calculateAlignmentGuides = useCallback((movingElement: EditorElement, newX: number, newY: number): AlignmentGuide[] => {
    if (!snapToElements) return [];
    
    const guides: AlignmentGuide[] = [];
    const threshold = SNAP_THRESHOLD;
    const movingRight = newX + (movingElement.position?.width || 200);
    const movingBottom = newY + (movingElement.position?.height || 50);
    const movingCenterX = newX + (movingElement.position?.width || 200) / 2;
    const movingCenterY = newY + (movingElement.position?.height || 50) / 2;

    safeElements.forEach((el) => {
      if (el.id === movingElement.id) return;
      
      const elPos = el.position || { x: 0, y: 0, width: 200, height: 50 };
      const elRight = elPos.x + elPos.width;
      const elBottom = elPos.y + elPos.height;
      const elCenterX = elPos.x + elPos.width / 2;
      const elCenterY = elPos.y + elPos.height / 2;

      // Left edge alignment
      if (Math.abs(newX - elPos.x) < threshold) {
        guides.push({ type: "vertical", position: elPos.x, start: Math.min(newY, elPos.y), end: Math.max(movingBottom, elBottom) });
      }
      // Right edge alignment
      if (Math.abs(movingRight - elRight) < threshold) {
        guides.push({ type: "vertical", position: elRight, start: Math.min(newY, elPos.y), end: Math.max(movingBottom, elBottom) });
      }
      // Center X alignment
      if (Math.abs(movingCenterX - elCenterX) < threshold) {
        guides.push({ type: "vertical", position: elCenterX, start: Math.min(newY, elPos.y), end: Math.max(movingBottom, elBottom) });
      }
      // Top edge alignment
      if (Math.abs(newY - elPos.y) < threshold) {
        guides.push({ type: "horizontal", position: elPos.y, start: Math.min(newX, elPos.x), end: Math.max(movingRight, elRight) });
      }
      // Bottom edge alignment
      if (Math.abs(movingBottom - elBottom) < threshold) {
        guides.push({ type: "horizontal", position: elBottom, start: Math.min(newX, elPos.x), end: Math.max(movingRight, elRight) });
      }
      // Center Y alignment
      if (Math.abs(movingCenterY - elCenterY) < threshold) {
        guides.push({ type: "horizontal", position: elCenterY, start: Math.min(newX, elPos.x), end: Math.max(movingRight, elRight) });
      }
    });

    return guides;
  }, [safeElements, snapToElements]);

  // Layer controls for selected element
  const selectedElement = useMemo(() => {
    return safeElements.find(el => el.id === selectedElementId);
  }, [safeElements, selectedElementId]);

  const handleDelete = useCallback(() => {
    if (selectedElementId) {
      saveToHistory();
      removeElement(selectedElementId);
    }
  }, [selectedElementId, saveToHistory, removeElement]);

  const handleDuplicate = useCallback(() => {
    if (selectedElementId) {
      saveToHistory();
      duplicateElement(selectedElementId);
    }
  }, [selectedElementId, saveToHistory, duplicateElement]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 bg-[#e5e5e5] overflow-hidden flex flex-col relative">
        {/* Canvas Controls Bar */}
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
          {/* Layout Mode Toggle */}
          <div className="flex items-center gap-1 bg-background/95 backdrop-blur border border-border rounded-lg shadow-sm p-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={layoutMode === "free" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setLayoutMode("free")}
                  className="h-7 px-2 text-xs"
                >
                  Free
                </Button>
              </TooltipTrigger>
              <TooltipContent>Free Positioning Mode</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={layoutMode === "structured" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setLayoutMode("structured")}
                  className="h-7 px-2 text-xs"
                >
                  Structured
                </Button>
              </TooltipTrigger>
              <TooltipContent>Structured Layout Mode</TooltipContent>
            </Tooltip>
          </div>

          {/* Snap Controls */}
          <div className="flex items-center gap-1 bg-background/95 backdrop-blur border border-border rounded-lg shadow-sm p-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={snapToGrid ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setSnapToGrid(!snapToGrid)}
                  className="h-7 w-7 p-0"
                >
                  <Grid3X3 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Snap to Grid</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={snapToElements ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setSnapToElements(!snapToElements)}
                  className="h-7 w-7 p-0"
                >
                  <Magnet className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Snap to Elements</TooltipContent>
            </Tooltip>
          </div>

          {/* View Toggles */}
          <div className="flex items-center gap-1 bg-background/95 backdrop-blur border border-border rounded-lg shadow-sm p-1">
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
        </div>

        {/* Layer Controls for Selected Element */}
        {selectedElement && (
          <div className="absolute top-14 right-2 z-20 bg-background/95 backdrop-blur border border-border rounded-lg shadow-sm p-1">
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={bringToFront} className="h-7 w-7 p-0">
                    <ChevronsUp className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bring to Front</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={bringForward} className="h-7 w-7 p-0">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bring Forward</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={sendBackward} className="h-7 w-7 p-0">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Send Backward</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={sendToBack} className="h-7 w-7 p-0">
                    <ChevronsDown className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Send to Back</TooltipContent>
              </Tooltip>
              
              <div className="w-px h-5 bg-border mx-0.5" />
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={handleDuplicate} className="h-7 w-7 p-0">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Duplicate (D)</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={handleDelete} className="h-7 w-7 p-0 hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete (Del)</TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="p-8 min-h-full flex justify-center">
            <div
              data-canvas="true"
              className={cn(
                "relative bg-white shadow-lg transition-all",
                viewMode !== "desktop" && "mx-auto"
              )}
              style={{
                width: `${canvasWidth}px`,
                minHeight: `${CANVAS_HEIGHT}px`,
              }}
              onClick={handleCanvasClick}
            >
              {/* Grid Background */}
              {showGrid && layoutMode === "free" && (
                <div
                  className="absolute inset-0 pointer-events-none opacity-[0.03]"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, #000 1px, transparent 1px),
                      linear-gradient(to bottom, #000 1px, transparent 1px)
                    `,
                    backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
                  }}
                />
              )}

              {/* Alignment Guides */}
              {alignmentGuides.map((guide, idx) => (
                <div
                  key={idx}
                  className="absolute bg-primary pointer-events-none z-50"
                  style={{
                    ...(guide.type === "vertical" && {
                      left: guide.position,
                      top: guide.start,
                      width: 1,
                      height: guide.end - guide.start,
                    }),
                    ...(guide.type === "horizontal" && {
                      top: guide.position,
                      left: guide.start,
                      height: 1,
                      width: guide.end - guide.start,
                    }),
                  }}
                />
              ))}

              {/* Free Mode: Render draggable positioned elements */}
              {layoutMode === "free" && safeElements.length > 0 && (
                <div className="relative w-full min-h-full">
                  {safeElements.map((element) => (
                    <DraggableElement
                      key={element.id}
                      element={element}
                      isSelected={selectedElementId === element.id}
                      isHovered={hoveredElementId === element.id}
                      onSelect={() => selectElement(element.id)}
                      onHover={(hover) => setHoveredElement(hover ? element.id : null)}
                      onDragStart={handleElementDragStart}
                      onDragEnd={handleElementDragEnd}
                      onPositionChange={(pos) => handleElementPositionChange(element.id, pos)}
                      onSizeChange={(size) => handleElementSizeChange(element.id, size)}
                    />
                  ))}
                </div>
              )}

              {/* Structured Mode: Render as stack */}
              {layoutMode === "structured" && safeElements.length > 0 && (
                <div className="p-6">
                  <SortableContext
                    items={safeElements.map((el) => el.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-0">
                      {safeElements.map((element) => (
                        <div key={element.id} className="relative group/sort">
                          <div className="absolute -top-1 left-0 right-0 h-1 bg-transparent hover:bg-blue-400 transition-colors z-10 rounded-t" />
                          
                          <ElementRenderer
                            element={element}
                            isSelected={selectedElementId === element.id}
                            isHovered={hoveredElementId === element.id}
                            onSelect={() => selectElement(element.id)}
                            onHover={(hover) => setHoveredElement(hover ? element.id : null)}
                          />
                          
                          <div className="absolute -bottom-1 left-0 right-0 h-1 bg-transparent hover:bg-blue-400 transition-colors z-10 rounded-b" />
                        </div>
                      ))}
                    </div>
                  </SortableContext>
                </div>
              )}

              {/* Empty State */}
              {safeElements.length === 0 && (
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
                      {layoutMode === "free" 
                        ? "Drag elements anywhere on the canvas for free positioning."
                        : "Click elements from the left panel to add them."}
                    </p>

                    {/* Quick action buttons */}
                    <div className="flex flex-wrap gap-2 justify-center mb-6">
                      <button
                        onClick={() => addElement(createElement("heading"))}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors shadow-md"
                      >
                        + Heading
                      </button>
                      <button
                        onClick={() => addElement(createElement("paragraph"))}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors shadow-md"
                      >
                        + Text
                      </button>
                      <button
                        onClick={() => addElement(createElement("button"))}
                        className="px-4 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors shadow-md"
                      >
                        + Button
                      </button>
                    </div>

                    {/* Mode indicator */}
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <span className={cn(
                        "px-2 py-1 rounded",
                        layoutMode === "free" ? "bg-primary/10 text-primary" : "bg-muted"
                      )}>
                        Free Mode: {layoutMode === "free" ? "ON" : "OFF"}
                      </span>
                      <span>Ctrl+Z Undo</span>
                      <span>Del Delete</span>
                      <span>D Duplicate</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeType && (
            <div className="bg-primary text-primary-foreground px-6 py-3 rounded-lg shadow-xl flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add {activeType}
            </div>
          )}
          {activeId && (
            <div className="bg-white border-2 border-primary rounded-lg shadow-xl p-4 opacity-90">
              Moving element...
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
