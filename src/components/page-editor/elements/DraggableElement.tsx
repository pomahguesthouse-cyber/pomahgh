import { useState, useRef, useCallback, useEffect, memo } from "react";
import { EditorElement, useEditorStore } from "@/stores/editorStore";
import { cn } from "@/lib/utils";
import { ElementRenderer } from "./ElementRenderer";

interface DraggableElementProps {
  element: EditorElement;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onPositionChange?: (position: { x: number; y: number }) => void;
  onSizeChange?: (size: { width: number; height: number }) => void;
}

type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const RESIZE_HANDLES: ResizeHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

const HANDLE_SIZE = 10;
const GRID_SIZE = 8;

export const DraggableElement = memo(function DraggableElement({
  element,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  onDragStart,
  onDragEnd,
  onPositionChange,
  onSizeChange,
}: DraggableElementProps) {
  const { updateElementPosition, saveToHistory, layoutMode, snapToGrid, zoom } = useEditorStore();
  
  const elementRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null);
  
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragStartElementPos = useRef({ x: 0, y: 0 });
  const resizeStartSize = useRef({ width: 0, height: 0 });
  const resizeStartPos = useRef({ x: 0, y: 0 });

  const position = element.position || { x: 0, y: 0, width: 200, height: 50, rotation: 0, zIndex: 0 };

  const snapValue = useCallback((value: number): number => {
    if (!snapToGrid) return value;
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  }, [snapToGrid]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (element.isLocked) return;
    if (layoutMode !== "free") return;
    
    e.preventDefault();
    e.stopPropagation();
    
    onSelect();
    setIsDragging(true);
    onDragStart?.();
    
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    dragStartElementPos.current = { 
      x: position.x || 0, 
      y: position.y || 0 
    };
    
    document.body.style.cursor = "move";
  }, [element.isLocked, layoutMode, onSelect, onDragStart, position.x, position.y]);

  const handleResizeStart = useCallback((e: React.MouseEvent, handle: ResizeHandle) => {
    if (element.isLocked) return;
    if (layoutMode !== "free") return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setActiveHandle(handle);
    onDragStart?.();
    
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    resizeStartSize.current = { 
      width: position.width || 200, 
      height: position.height || 50 
    };
    resizeStartPos.current = { 
      x: position.x || 0, 
      y: position.y || 0 
    };
  }, [element.isLocked, layoutMode, onDragStart, position]);

  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const scale = zoom / 100;
      
      if (isDragging) {
        const deltaX = (e.clientX - dragStartPos.current.x) / scale;
        const deltaY = (e.clientY - dragStartPos.current.y) / scale;
        
        const newX = snapValue(dragStartElementPos.current.x + deltaX);
        const newY = snapValue(dragStartElementPos.current.y + deltaY);
        
        onPositionChange?.({ x: newX, y: newY });
      }
      
      if (isResizing && activeHandle) {
        const deltaX = (e.clientX - dragStartPos.current.x) / scale;
        const deltaY = (e.clientY - dragStartPos.current.y) / scale;
        
        let newWidth = resizeStartSize.current.width;
        let newHeight = resizeStartSize.current.height;
        let newX = resizeStartPos.current.x;
        let newY = resizeStartPos.current.y;
        
        if (activeHandle.includes("e")) {
          newWidth = Math.max(50, snapValue(resizeStartSize.current.width + deltaX));
        }
        if (activeHandle.includes("s")) {
          newHeight = Math.max(30, snapValue(resizeStartSize.current.height + deltaY));
        }
        if (activeHandle.includes("w")) {
          const widthChange = Math.min(deltaX, resizeStartSize.current.width - 50);
          newWidth = snapValue(resizeStartSize.current.width - widthChange);
          newX = snapValue(resizeStartPos.current.x + widthChange);
        }
        if (activeHandle.includes("n")) {
          const heightChange = Math.min(deltaY, resizeStartSize.current.height - 30);
          newHeight = snapValue(resizeStartSize.current.height - heightChange);
          newY = snapValue(resizeStartPos.current.y + heightChange);
        }
        
        onSizeChange?.({ width: newWidth, height: newHeight });
        if (newX !== resizeStartPos.current.x || newY !== resizeStartPos.current.y) {
          onPositionChange?.({ x: newX, y: newY });
        }
      }
    };

    const handleMouseUp = () => {
      if (isDragging || isResizing) {
        saveToHistory();
      }
      
      setIsDragging(false);
      setIsResizing(false);
      setActiveHandle(null);
      onDragEnd?.();
      document.body.style.cursor = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, isResizing, activeHandle, zoom, snapValue, onPositionChange, onSizeChange, onDragEnd, saveToHistory]);

  const handlePositionUpdate = useCallback((pos: { x: number; y: number }) => {
    updateElementPosition(element.id, { x: pos.x, y: pos.y });
  }, [element.id, updateElementPosition]);

  const handleSizeUpdate = useCallback((size: { width: number; height: number }) => {
    updateElementPosition(element.id, { width: size.width, height: size.height });
  }, [element.id, updateElementPosition]);

  const handlePositionChange = onPositionChange || handlePositionUpdate;
  const handleSizeChange = onSizeChange || handleSizeUpdate;

  const cursorStyle = isDragging ? "cursor-grabbing" : "cursor-grab";
  const showHandles = (isSelected || isHovered) && layoutMode === "free" && !element.isLocked;

  return (
    <div
      ref={elementRef}
      className={cn(
        "absolute transition-shadow",
        layoutMode === "free" ? cursorStyle : "",
        element.isLocked && "pointer-events-none"
      )}
      style={{
        left: layoutMode === "free" ? position.x : undefined,
        top: layoutMode === "free" ? position.y : undefined,
        width: layoutMode === "free" ? position.width : undefined,
        height: layoutMode === "free" ? position.height : undefined,
        zIndex: position.zIndex || 0,
        transform: position.rotation ? `rotate(${position.rotation}deg)` : undefined,
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {/* Selection outline */}
      {(isSelected || isHovered) && layoutMode === "free" && (
        <div
          className={cn(
            "absolute inset-0 border-2 rounded-md pointer-events-none transition-colors",
            isSelected ? "border-primary" : "border-blue-400"
          )}
          style={{
            margin: `-${isSelected ? 2 : 1}px`,
          }}
        />
      )}
      
      {/* Element content */}
      <div className={cn(
        "w-full h-full",
        isSelected && layoutMode === "free" && "ring-2 ring-primary ring-offset-1 rounded-md"
      )}>
        <ElementRenderer
          element={element}
          isSelected={isSelected}
          isHovered={isHovered}
          onSelect={onSelect}
          onHover={onHover}
        />
      </div>

      {/* Resize handles */}
      {showHandles && RESIZE_HANDLES.map((handle) => {
        const handleStyles: React.CSSProperties = {
          position: "absolute",
          width: HANDLE_SIZE,
          height: HANDLE_SIZE,
          background: "white",
          border: "2px solid hsl(var(--primary))",
          borderRadius: "50%",
          zIndex: 10,
          cursor: `${handle}-resize`,
        };

        switch (handle) {
          case "nw":
            handleStyles.top = -HANDLE_SIZE / 2;
            handleStyles.left = -HANDLE_SIZE / 2;
            break;
          case "n":
            handleStyles.top = -HANDLE_SIZE / 2;
            handleStyles.left = "50%";
            handleStyles.transform = "translateX(-50%)";
            break;
          case "ne":
            handleStyles.top = -HANDLE_SIZE / 2;
            handleStyles.right = -HANDLE_SIZE / 2;
            break;
          case "e":
            handleStyles.top = "50%";
            handleStyles.right = -HANDLE_SIZE / 2;
            handleStyles.transform = "translateY(-50%)";
            break;
          case "se":
            handleStyles.bottom = -HANDLE_SIZE / 2;
            handleStyles.right = -HANDLE_SIZE / 2;
            break;
          case "s":
            handleStyles.bottom = -HANDLE_SIZE / 2;
            handleStyles.left = "50%";
            handleStyles.transform = "translateX(-50%)";
            break;
          case "sw":
            handleStyles.bottom = -HANDLE_SIZE / 2;
            handleStyles.left = -HANDLE_SIZE / 2;
            break;
          case "w":
            handleStyles.top = "50%";
            handleStyles.left = -HANDLE_SIZE / 2;
            handleStyles.transform = "translateY(-50%)";
            break;
        }

        return (
          <div
            key={handle}
            style={handleStyles}
            onMouseDown={(e) => handleResizeStart(e, handle)}
          />
        );
      })}

      {/* Position indicator when selected */}
      {isSelected && layoutMode === "free" && (
        <div className="absolute -top-7 left-0 flex items-center gap-1 text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-t-md opacity-90 pointer-events-none">
          <span>X: {Math.round(position.x || 0)}</span>
          <span>Y: {Math.round(position.y || 0)}</span>
          <span className="mx-1">|</span>
          <span>W: {Math.round(position.width || 200)}</span>
          <span>H: {Math.round(position.height || 50)}</span>
        </div>
      )}
    </div>
  );
});
