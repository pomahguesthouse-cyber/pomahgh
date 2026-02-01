import React from 'react';
import { usePageEditor } from '@/contexts/PageEditorContext';
import { PageSection } from '@/types/page-editor';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ComponentRenderer } from './ComponentRenderer';
import { Button } from '@/components/ui/button';
import { GripVertical, ChevronUp, ChevronDown, Trash2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionRendererProps {
  section: PageSection;
  index: number;
}

export function SectionRenderer({ section, index }: SectionRendererProps) {
  const { 
    editorState, 
    setSelectedSection, 
    moveSection, 
    deleteSection,
    addSection,
    schema 
  } = usePageEditor();

  const isSelected = editorState.selectedSectionId === section.id;

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: section.id,
    data: { type: 'section', section },
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `section-drop-${section.id}`,
    data: { type: 'section', sectionId: section.id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...section.styles,
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSection(section.id);
  };

  return (
    <div
      ref={(node) => {
        setSortableRef(node);
        setDroppableRef(node);
      }}
      className={cn(
        "relative group transition-all",
        isDragging && "opacity-50",
        isSelected && "ring-2 ring-primary ring-inset",
        isOver && "bg-primary/5"
      )}
      style={style}
      onClick={handleClick}
    >
      {/* Section Controls */}
      <div className={cn(
        "absolute -left-10 top-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
        isSelected && "opacity-100"
      )}>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 cursor-grab"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => { e.stopPropagation(); moveSection(section.id, 'up'); }}
          disabled={index === 0}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => { e.stopPropagation(); moveSection(section.id, 'down'); }}
          disabled={index === schema.sections.length - 1}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); deleteSection(section.id); }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Section Label */}
      <div className={cn(
        "absolute -top-6 left-0 text-xs font-medium px-2 py-1 rounded-t bg-primary text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity",
        isSelected && "opacity-100"
      )}>
        {section.name}
      </div>

      {/* Components */}
      <SortableContext
        items={section.components.map(c => c.id)}
        strategy={verticalListSortingStrategy}
      >
        {section.components.length === 0 ? (
          <div className="min-h-[100px] border-2 border-dashed border-muted-foreground/20 rounded-lg m-4 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Drag komponen ke sini
            </p>
          </div>
        ) : (
          <div className="space-y-2 p-2">
            {section.components.map((component, compIndex) => (
              <ComponentRenderer 
                key={component.id} 
                component={component}
                sectionId={section.id}
                index={compIndex}
              />
            ))}
          </div>
        )}
      </SortableContext>

      {/* Add component hint */}
      {section.components.length > 0 && (
        <div className="h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="h-px flex-1 bg-muted-foreground/20" />
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs gap-1"
            onClick={(e) => { e.stopPropagation(); addSection(index + 1); }}
          >
            <Plus className="h-3 w-3" />
            Section
          </Button>
          <div className="h-px flex-1 bg-muted-foreground/20" />
        </div>
      )}
    </div>
  );
}
