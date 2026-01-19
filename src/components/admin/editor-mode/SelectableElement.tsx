import React, { useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useEditorMode } from '@/contexts/EditorModeContext';

export type ElementType = 'text' | 'heading' | 'button' | 'image' | 'link' | 'container';

interface SelectableElementProps {
  elementId: string;
  type: ElementType;
  editable?: boolean;
  children: React.ReactNode;
  className?: string;
  onContentChange?: (newContent: string) => void;
}

export function SelectableElement({
  elementId,
  type,
  editable = true,
  children,
  className,
  onContentChange,
}: SelectableElementProps) {
  const {
    selectedElement,
    setSelectedElement,
    hoveredElement,
    setHoveredElement,
    editingElement,
    setEditingElement,
    isEditorMode,
  } = useEditorMode();

  const elementRef = useRef<HTMLDivElement>(null);
  const [isContentEditable, setIsContentEditable] = useState(false);

  const isSelected = selectedElement === elementId;
  const isHovered = hoveredElement === elementId && !isSelected;
  const isEditing = editingElement === elementId;

  const handleMouseEnter = useCallback(() => {
    if (isEditorMode && !isEditing) {
      setHoveredElement(elementId);
    }
  }, [elementId, isEditorMode, isEditing, setHoveredElement]);

  const handleMouseLeave = useCallback(() => {
    if (isEditorMode) {
      setHoveredElement(null);
    }
  }, [isEditorMode, setHoveredElement]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!isEditorMode) return;
    
    e.stopPropagation();
    
    if (!isSelected) {
      setSelectedElement(elementId);
      setEditingElement(null);
    }
  }, [elementId, isEditorMode, isSelected, setSelectedElement, setEditingElement]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!isEditorMode || !editable) return;
    
    e.stopPropagation();
    
    if (type === 'text' || type === 'heading') {
      setEditingElement(elementId);
      setIsContentEditable(true);
      
      // Focus the element after a tick
      setTimeout(() => {
        if (elementRef.current) {
          const editableChild = elementRef.current.querySelector('[contenteditable="true"]');
          if (editableChild) {
            (editableChild as HTMLElement).focus();
          }
        }
      }, 0);
    }
  }, [elementId, type, isEditorMode, editable, setEditingElement]);

  const handleBlur = useCallback(() => {
    if (isEditing) {
      setIsContentEditable(false);
      setEditingElement(null);
      
      // Get the new content and trigger callback
      if (elementRef.current && onContentChange) {
        const editableChild = elementRef.current.querySelector('[contenteditable]');
        if (editableChild) {
          onContentChange(editableChild.textContent || '');
        }
      }
    }
  }, [isEditing, setEditingElement, onContentChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsContentEditable(false);
      setEditingElement(null);
      setSelectedElement(null);
    }
    if (e.key === 'Enter' && !e.shiftKey && type !== 'text') {
      e.preventDefault();
      setIsContentEditable(false);
      setEditingElement(null);
    }
  }, [type, setEditingElement, setSelectedElement]);

  if (!isEditorMode) {
    return <>{children}</>;
  }

  const getTypeLabel = () => {
    switch (type) {
      case 'heading': return 'Heading';
      case 'text': return 'Text';
      case 'button': return 'Button';
      case 'image': return 'Image';
      case 'link': return 'Link';
      case 'container': return 'Section';
      default: return 'Element';
    }
  };

  return (
    <div
      ref={elementRef}
      className={cn(
        'relative transition-all duration-150',
        isHovered && 'outline outline-1 outline-dashed outline-primary/60 outline-offset-2',
        isSelected && !isEditing && 'outline outline-2 outline-solid outline-primary outline-offset-2 shadow-[0_0_0_4px_rgba(var(--primary),0.1)]',
        isEditing && 'outline outline-2 outline-solid outline-green-500 outline-offset-2 bg-green-500/5',
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      {/* Type label badge */}
      {(isHovered || isSelected) && !isEditing && (
        <div className="absolute -top-6 left-0 z-10 px-1.5 py-0.5 text-[10px] font-medium bg-primary text-primary-foreground rounded">
          {getTypeLabel()}
        </div>
      )}

      {/* Render children with contentEditable if editing */}
      {isEditing && (type === 'text' || type === 'heading') ? (
        React.cloneElement(children as React.ReactElement, {
          contentEditable: true,
          suppressContentEditableWarning: true,
          className: cn(
            (children as React.ReactElement).props.className,
            'outline-none cursor-text'
          ),
        })
      ) : (
        children
      )}
    </div>
  );
}
