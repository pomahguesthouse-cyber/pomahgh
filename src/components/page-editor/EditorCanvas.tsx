import { useState, useCallback, useRef, useMemo, memo, useEffect } from "react";
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
import { PreviewFrame } from "./PreviewFrame";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  Grid3X3, 
  Ruler, 
  Magnet, 
  Eye,
  Pencil,
  MousePointer2,
  ChevronDown,
  Trash2,
  Copy,
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
const CANVAS_WIDTH = 1440;
const CANVAS_HEIGHT = 800;
const SNAP_THRESHOLD = 8;

type EditorMode = 'edit' | 'preview';

export function EditorCanvas() {
  const {
    elements,
    setElements,
    addElement,
    selectedElementId,
    hoveredElementId,
    selectElement,
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
  } = useEditorStore();

  const safeElements = Array.isArray(elements) ? elements : [];

  const [editorMode, setEditorMode] = useState<EditorMode>('edit');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [alignmentGuides, setAlignmentGuides] = useState<{type: "horizontal" | "vertical"; position: number; start: number; end: number}[]>([]);

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

      const overIndex = safeElements.findIndex((el) => el.id === over.id);
      if (overIndex >= 0) {
        addElement(newElement, undefined, overIndex);
      } else {
        addElement(newElement);
      }
      return;
    }

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
    if (e.target === e.currentTarget) {
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

  const canvasWidth = viewMode === 'mobile' ? 375 : viewMode === 'tablet' ? 768 : CANVAS_WIDTH;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 flex flex-col overflow-hidden bg-neutral-100">
        {/* Canvas Controls Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-neutral-200">
          {/* Left: Mode toggle & Layout mode */}
          <div className="flex items-center gap-3">
            {/* Edit/Preview Toggle */}
            <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={editorMode === 'edit' ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setEditorMode('edit')}
                    className="h-7 gap-1.5 text-xs"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit Mode - Click & drag elements</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={editorMode === 'preview' ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setEditorMode('preview')}
                    className="h-7 gap-1.5 text-xs"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Preview
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Preview Mode - True browser simulation</TooltipContent>
              </Tooltip>
            </div>

            {editorMode === 'edit' && (
              <>
                <div className="h-5 w-px bg-neutral-300" />
                
                {/* Layout Mode Toggle */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={layoutMode === 'free' ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setLayoutMode(layoutMode === 'free' ? 'structured' : 'free')}
                      className="h-7 gap-1.5 text-xs"
                    >
                      <MousePointer2 className="h-3.5 w-3.5" />
                      {layoutMode === 'free' ? 'Free' : 'Structured'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {layoutMode === 'free' ? 'Free positioning mode' : 'Structured stacking mode'}
                  </TooltipContent>
                </Tooltip>
              </>
            )}
          </div>

          {/* Center: Snap controls (edit mode only) */}
          {editorMode === 'edit' && (
            <div className="flex items-center gap-1">
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
                <TooltipContent>Snap to Grid (8px)</TooltipContent>
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
                <TooltipContent>Toggle Grid Overlay</TooltipContent>
              </Tooltip>

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
            </div>
          )}

          {/* Right: Layer controls (when element selected) */}
          {editorMode === 'edit' && selectedElement && (
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
              
              <div className="h-5 w-px bg-neutral-300 mx-1" />
              
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
                  <Button variant="ghost" size="sm" onClick={handleDelete} className="h-7 w-7 p-0 hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete (Del)</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 overflow-hidden relative">
          {editorMode === 'preview' ? (
            /* Preview Mode - True browser simulation */
            <PreviewFrame
              elements={safeElements}
              pageSettings={{
                title: 'Preview',
                slug: 'preview',
              }}
              viewMode={viewMode}
              selectedElementId={selectedElementId}
              onElementSelect={selectElement}
              className="h-full"
            />
          ) : (
            /* Edit Mode - Interactive editor */
            <ScrollArea className="h-full">
              <div className="p-8 min-h-full flex justify-center">
                <div
                  data-canvas="true"
                  className={cn(
                    "relative bg-white shadow-2xl transition-all",
                    viewMode !== "desktop" && "mx-auto"
                  )}
                  style={{
                    width: `${canvasWidth}px`,
                    minHeight: `${CANVAS_HEIGHT}px`,
                  }}
                  onClick={handleCanvasClick}
                >
                  {/* Grid Background */}
                  {showGrid && layoutMode === 'free' && (
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
                      className="absolute bg-blue-500 pointer-events-none z-50"
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
                  {layoutMode === 'free' && safeElements.length > 0 && (
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
                  {layoutMode === 'structured' && safeElements.length > 0 && (
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
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                          <Plus className="h-10 w-10 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          Start Building Your Page
                        </h3>
                        <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                          {layoutMode === 'free' 
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
                        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                          <span className={cn(
                            "px-2 py-1 rounded",
                            layoutMode === 'free' ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
                          )}>
                            Free Mode: {layoutMode === 'free' ? 'ON' : 'OFF'}
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
          )}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeType && (
            <div className="bg-blue-500 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add {activeType}
            </div>
          )}
          {activeId && (
            <div className="bg-white border-2 border-blue-500 rounded-lg shadow-xl p-4 opacity-90">
              Moving element...
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
}

export default EditorCanvas;
