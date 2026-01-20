import React, { useContext, useState, useRef } from 'react';
import { EditorModeContext, ElementOverride } from '@/contexts/EditorModeContext';
import { cn } from '@/lib/utils';

interface EditableImageProps {
  widgetId: string;
  field: string;
  src: string;
  alt: string;
  className?: string;
  defaultWidth?: string;
  defaultHeight?: string;
}

export function EditableImage({
  widgetId,
  field,
  src,
  alt,
  className,
  defaultWidth = '100%',
  defaultHeight = 'auto',
}: EditableImageProps) {
  const context = useContext(EditorModeContext);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const startSize = useRef({ width: 0, height: 0 });
  const startPos = useRef({ x: 0, y: 0 });

  if (!context) {
    return <img src={src} alt={alt} className={className} />;
  }

  const {
    isEditorMode,
    selectedElement,
    setSelectedElement,
    elementOverrides,
    updateElementOverride,
  } = context;

  const elementId = `${widgetId}-${field}`;
  const overrides = elementOverrides[elementId] || {};

  const displaySrc = overrides.imageUrl || src;

  const imageStyles: React.CSSProperties = {
    width: overrides.imageWidth || defaultWidth,
    height: overrides.imageHeight || defaultHeight,
    objectFit: (overrides.objectFit as React.CSSProperties['objectFit']) || 'cover',
    objectPosition: overrides.objectPosition || 'center',
    borderRadius: overrides.borderRadius,
    opacity: overrides.hidden ? 0.3 : 1,
    aspectRatio: overrides.aspectRatio,
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isEditorMode) {
      e.stopPropagation();
      e.preventDefault();
      setSelectedElement(elementId);
    }
  };

  const handleResizeStart = (e: React.MouseEvent, corner: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    startSize.current = { width: rect.width, height: rect.height };
    startPos.current = { x: e.clientX, y: e.clientY };
    setIsResizing(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startPos.current.x;
      const deltaY = moveEvent.clientY - startPos.current.y;

      let newWidth = startSize.current.width;
      let newHeight = startSize.current.height;

      if (corner.includes('right')) {
        newWidth = Math.max(50, startSize.current.width + deltaX);
      } else if (corner.includes('left')) {
        newWidth = Math.max(50, startSize.current.width - deltaX);
      }

      if (corner.includes('bottom')) {
        newHeight = Math.max(50, startSize.current.height + deltaY);
      } else if (corner.includes('top')) {
        newHeight = Math.max(50, startSize.current.height - deltaY);
      }

      // Maintain aspect ratio if shift is held
      if (moveEvent.shiftKey) {
        const aspectRatio = startSize.current.width / startSize.current.height;
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          newHeight = newWidth / aspectRatio;
        } else {
          newWidth = newHeight * aspectRatio;
        }
      }

      updateElementOverride(elementId, {
        imageWidth: `${Math.round(newWidth)}px`,
        imageHeight: `${Math.round(newHeight)}px`,
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (!isEditorMode) {
    return <img src={displaySrc} alt={alt} className={className} style={imageStyles} />;
  }

  const isSelected = selectedElement === elementId;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative group inline-block',
        isSelected && 'z-10'
      )}
      style={{
        width: overrides.imageWidth || defaultWidth,
        height: overrides.imageHeight || defaultHeight,
      }}
    >
      <img
        data-element-id={elementId}
        data-element-type="image"
        src={displaySrc}
        alt={alt}
        onClick={handleClick}
        className={cn(
          className,
          'transition-all duration-200 w-full h-full',
          'hover:outline-dashed hover:outline-2 hover:outline-primary/50 hover:outline-offset-2',
          isSelected && 'outline-solid outline-2 outline-primary outline-offset-2'
        )}
        style={{
          ...imageStyles,
          width: '100%',
          height: '100%',
        }}
      />

      {/* Resize handles when selected */}
      {isSelected && (
        <>
          {/* Corner handles */}
          <div
            className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-primary rounded-full cursor-nwse-resize border-2 border-white shadow-md hover:scale-125 transition-transform"
            onMouseDown={(e) => handleResizeStart(e, 'top-left')}
          />
          <div
            className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-primary rounded-full cursor-nesw-resize border-2 border-white shadow-md hover:scale-125 transition-transform"
            onMouseDown={(e) => handleResizeStart(e, 'top-right')}
          />
          <div
            className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-primary rounded-full cursor-nesw-resize border-2 border-white shadow-md hover:scale-125 transition-transform"
            onMouseDown={(e) => handleResizeStart(e, 'bottom-left')}
          />
          <div
            className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-primary rounded-full cursor-nwse-resize border-2 border-white shadow-md hover:scale-125 transition-transform"
            onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
          />

          {/* Edge handles */}
          <div
            className="absolute top-1/2 -left-1.5 w-2 h-6 -translate-y-1/2 bg-primary rounded-sm cursor-ew-resize border border-white shadow-md hover:scale-110 transition-transform"
            onMouseDown={(e) => handleResizeStart(e, 'left')}
          />
          <div
            className="absolute top-1/2 -right-1.5 w-2 h-6 -translate-y-1/2 bg-primary rounded-sm cursor-ew-resize border border-white shadow-md hover:scale-110 transition-transform"
            onMouseDown={(e) => handleResizeStart(e, 'right')}
          />
          <div
            className="absolute -top-1.5 left-1/2 w-6 h-2 -translate-x-1/2 bg-primary rounded-sm cursor-ns-resize border border-white shadow-md hover:scale-110 transition-transform"
            onMouseDown={(e) => handleResizeStart(e, 'top')}
          />
          <div
            className="absolute -bottom-1.5 left-1/2 w-6 h-2 -translate-x-1/2 bg-primary rounded-sm cursor-ns-resize border border-white shadow-md hover:scale-110 transition-transform"
            onMouseDown={(e) => handleResizeStart(e, 'bottom')}
          />
        </>
      )}

      {/* Resize indicator */}
      {isResizing && (
        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
          <span className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium">
            {overrides.imageWidth} × {overrides.imageHeight}
          </span>
        </div>
      )}
    </div>
  );
}












