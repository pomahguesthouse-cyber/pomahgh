import React from 'react';
import { useEditorMode } from '@/contexts/EditorModeContext';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { WIDGET_LABELS, WidgetId } from '@/types/editor.types';
import { GripVertical, Settings2, Eye, EyeOff } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

interface SortableWidgetItemProps {
  widgetId: string;
  enabled: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onSettings: () => void;
}

function SortableWidgetItem({
  widgetId,
  enabled,
  isSelected,
  onToggle,
  onSelect,
  onSettings,
}: SortableWidgetItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widgetId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-3 rounded-lg border bg-card transition-all",
        isDragging && "opacity-50 shadow-lg",
        isSelected && "ring-2 ring-primary border-primary",
        !enabled && "opacity-60"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      
      <div 
        className="flex-1 cursor-pointer"
        onClick={onSelect}
      >
        <div className="flex items-center gap-2">
          {enabled ? (
            <Eye className="h-4 w-4 text-muted-foreground" />
          ) : (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          )}
          <span className={cn("font-medium text-sm", !enabled && "text-muted-foreground")}>
            {WIDGET_LABELS[widgetId as WidgetId] || widgetId}
          </span>
        </div>
      </div>
      
      <Switch
        checked={enabled}
        onCheckedChange={onToggle}
        aria-label={`Toggle ${widgetId}`}
      />
      
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onSettings}
      >
        <Settings2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function WidgetManager() {
  const { 
    widgetConfigs, 
    toggleWidget, 
    reorderWidgets, 
    selectedWidget, 
    setSelectedWidget 
  } = useEditorMode();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = widgetConfigs.findIndex((w) => w.widget_id === active.id);
      const newIndex = widgetConfigs.findIndex((w) => w.widget_id === over.id);
      
      const newOrder = arrayMove(
        widgetConfigs.map(w => w.widget_id),
        oldIndex,
        newIndex
      );
      
      reorderWidgets(newOrder);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        Drag to reorder • Click to select • Toggle to show/hide
      </div>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={widgetConfigs.map(w => w.widget_id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {widgetConfigs.map((widget) => (
              <SortableWidgetItem
                key={widget.widget_id}
                widgetId={widget.widget_id}
                enabled={widget.enabled}
                isSelected={selectedWidget === widget.widget_id}
                onToggle={() => toggleWidget(widget.widget_id)}
                onSelect={() => setSelectedWidget(widget.widget_id)}
                onSettings={() => setSelectedWidget(widget.widget_id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
