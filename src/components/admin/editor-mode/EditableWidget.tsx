import React from 'react';
import { useEditorMode } from '@/contexts/EditorModeContext';
import { WidgetOverlay } from './WidgetOverlay';
import { FloatingToolbar } from './FloatingToolbar';
import { cn } from '@/lib/utils';
import { WIDGET_LABELS, WidgetId } from '@/types/editor.types';

interface EditableWidgetProps {
  id: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}

export function EditableWidget({ id, label, children, className }: EditableWidgetProps) {
  const { 
    isEditorMode,
    selectedWidget, 
    setSelectedWidget,
    hoveredWidget,
    setHoveredWidget,
    widgetConfigs,
    setPanelOpen,
    setSelectedElement
  } = useEditorMode();

  const widgetConfig = widgetConfigs.find(w => w.widget_id === id);
  const isEnabled = widgetConfig?.enabled ?? true;
  const isHovered = hoveredWidget === id;
  const isSelected = selectedWidget === id;

  // Get proper label from WIDGET_LABELS or use provided label
  const displayLabel = WIDGET_LABELS[id as WidgetId] || label;

  if (!isEditorMode) {
    // When not in editor mode, hide disabled widgets
    if (!isEnabled) return null;
    return <>{children}</>;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Clear element selection when selecting a widget
    setSelectedElement(null);
    setSelectedWidget(id);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Open settings panel on double-click
    setSelectedWidget(id);
    setPanelOpen(true);
  };

  const handleMouseEnter = () => {
    setHoveredWidget(id);
  };

  const handleMouseLeave = () => {
    setHoveredWidget(null);
  };

  const handleOpenSettings = () => {
    setPanelOpen(true);
  };

  return (
    <div
      className={cn(
        'relative transition-all duration-200',
        !isEnabled && 'opacity-40 grayscale',
        isSelected && 'z-10',
        className
      )}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ cursor: 'pointer' }}
    >
      <WidgetOverlay
        isHovered={isHovered}
        isSelected={isSelected}
        label={displayLabel}
      >
        {children}
      </WidgetOverlay>
      
      <FloatingToolbar
        widgetId={id}
        isEnabled={isEnabled}
        onOpenSettings={handleOpenSettings}
      />
    </div>
  );
}
