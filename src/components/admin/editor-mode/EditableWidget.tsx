import React from 'react';
import { useEditorMode } from '@/contexts/EditorModeContext';
import { WidgetOverlay } from './WidgetOverlay';
import { FloatingToolbar } from './FloatingToolbar';
import { cn } from '@/lib/utils';

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
    setPanelOpen
  } = useEditorMode();

  const widgetConfig = widgetConfigs.find(w => w.widget_id === id);
  const isEnabled = widgetConfig?.enabled ?? true;
  const isHovered = hoveredWidget === id;
  const isSelected = selectedWidget === id;

  if (!isEditorMode) {
    return <>{children}</>;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedWidget(id);
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
        'relative cursor-pointer transition-opacity duration-200',
        !isEnabled && 'opacity-40',
        className
      )}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <WidgetOverlay
        isHovered={isHovered}
        isSelected={isSelected}
        label={label}
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












