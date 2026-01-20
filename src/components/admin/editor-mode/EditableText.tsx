import React, { useRef, useState, useEffect, useContext } from 'react';
import { cn } from '@/lib/utils';
import { EditorModeContext } from '@/contexts/EditorModeContext';

interface EditableTextProps {
  widgetId: string;
  field: string;
  value: string;
  className?: string;
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'div';
  multiline?: boolean;
}

export function EditableText({
  widgetId,
  field,
  value,
  className,
  as: Component = 'span',
  multiline = false,
}: EditableTextProps) {
  const context = useContext(EditorModeContext);
  
  const ref = useRef<HTMLElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // If not in editor mode context, just render normally
  if (!context) {
    return <Component className={className}>{value}</Component>;
  }
  
  const { 
    isEditorMode, 
    updateWidgetText, 
    widgetTextOverrides,
    selectedElement,
    setSelectedElement,
    elementOverrides,
  } = context;
  
  const elementId = `${widgetId}-${field}`;
  const displayValue = widgetTextOverrides[widgetId]?.[field] ?? value;
  const overrides = elementOverrides[elementId] || {};
  
  // Build font styles from overrides
  const fontStyles: React.CSSProperties = {
    fontFamily: overrides.fontFamily && overrides.fontFamily !== 'inherit' ? overrides.fontFamily : undefined,
    fontSize: overrides.fontSize || undefined,
    fontWeight: overrides.fontWeight || undefined,
    fontStyle: overrides.fontStyle || undefined,
    textDecoration: overrides.textDecoration || undefined,
    textAlign: overrides.textAlign as React.CSSProperties['textAlign'] || undefined,
    color: overrides.color || undefined,
    opacity: overrides.hidden ? 0.3 : undefined,
  };

  useEffect(() => {
    if (ref.current && !isEditing) {
      ref.current.innerText = displayValue;
    }
  }, [displayValue, isEditing]);

  const handleClick = (e: React.MouseEvent) => {
    if (isEditorMode) {
      e.stopPropagation();
      setSelectedElement(elementId);
    }
  };

  const handleFocus = () => {
    setIsEditing(true);
  };

  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
    setIsEditing(false);
    const newValue = e.currentTarget.innerText;
    if (newValue !== displayValue) {
      updateWidgetText(widgetId, field, newValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (!multiline && e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  if (!isEditorMode) {
    return <Component className={className} style={fontStyles}>{displayValue}</Component>;
  }

  const isSelected = selectedElement === elementId;

  return (
    <Component
      ref={ref as any}
      data-element-id={elementId}
      contentEditable
      suppressContentEditableWarning
      onClick={handleClick}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={cn(
        className,
        'outline-none transition-all duration-200',
        'hover:outline-dashed hover:outline-2 hover:outline-primary/50 hover:outline-offset-2',
        isSelected && 'outline-solid outline-2 outline-primary outline-offset-2',
        isEditing && 'bg-primary/5'
      )}
      style={{ 
        ...fontStyles,
        minWidth: '20px', 
        cursor: 'text' 
      }}
    >
      {displayValue}
    </Component>
  );
}
