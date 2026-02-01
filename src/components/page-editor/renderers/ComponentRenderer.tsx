import React from 'react';
import { usePageEditor } from '@/contexts/PageEditorContext';
import { PageComponent } from '@/types/page-editor';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Individual component renderers
import { HeadingComponent } from './components/HeadingComponent';
import { ParagraphComponent } from './components/ParagraphComponent';
import { ImageComponent } from './components/ImageComponent';
import { CTAButtonComponent } from './components/CTAButtonComponent';
import { HeroSectionComponent } from './components/HeroSectionComponent';
import { SEOContentComponent } from './components/SEOContentComponent';
import { DividerComponent } from './components/DividerComponent';
import { FeatureListComponent } from './components/FeatureListComponent';
import { FAQComponent } from './components/FAQComponent';

interface ComponentRendererProps {
  component: PageComponent;
  sectionId: string;
  index: number;
}

const componentMap: Record<string, React.FC<{ component: PageComponent }>> = {
  'heading': HeadingComponent,
  'paragraph': ParagraphComponent,
  'image': ImageComponent,
  'cta-button': CTAButtonComponent,
  'hero-section': HeroSectionComponent,
  'seo-content': SEOContentComponent,
  'divider': DividerComponent,
  'feature-list': FeatureListComponent,
  'faq': FAQComponent,
};

export function ComponentRenderer({ component, sectionId, index }: ComponentRendererProps) {
  const { editorState, setSelectedComponent, updateComponent } = usePageEditor();
  const isSelected = editorState.selectedComponentId === component.id;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: component.id,
    data: { type: 'component', component, sectionId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedComponent(component.id);
  };

  const Renderer = componentMap[component.type];

  if (!Renderer) {
    return (
      <div className="p-4 bg-muted rounded text-center text-sm text-muted-foreground">
        Komponen "{component.type}" tidak ditemukan
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative group rounded transition-all",
        isDragging && "opacity-50",
        isSelected && "ring-2 ring-primary"
      )}
      style={{ ...style, ...component.styles }}
      onClick={handleClick}
    >
      {/* Drag Handle */}
      <div className={cn(
        "absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity",
        isSelected && "opacity-100"
      )}>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 cursor-grab"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3 w-3" />
        </Button>
      </div>

      <Renderer component={component} />
    </div>
  );
}
