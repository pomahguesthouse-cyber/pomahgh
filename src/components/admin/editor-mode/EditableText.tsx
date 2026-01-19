import React, { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useEditorMode } from '@/contexts/EditorModeContext';

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
  const { isEditorMode, updateWidgetText, widgetTextOverrides } = useEditorMode();
  const ref = useRef<HTMLElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Get overridden value or use original
  const displayValue = widgetTextOverrides[widgetId]?.[field] ?? value;

  useEffect(() => {
    if (ref.current && !isEditing) {
      ref.current.innerText = displayValue;
    }
  }, [displayValue, isEditing]);

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
    return <Component className={className}>{displayValue}</Component>;
  }

  return (
    <Component
      ref={ref as any}
      contentEditable
      suppressContentEditableWarning
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={cn(
        className,
        'outline-none transition-all duration-200',
        'hover:outline-dashed hover:outline-2 hover:outline-primary/50 hover:outline-offset-2',
        isEditing && 'outline-dashed outline-2 outline-primary outline-offset-2 bg-primary/5'
      )}
      style={{ minWidth: '20px', cursor: 'text' }}
    >
      {displayValue}
    </Component>
  );
}
