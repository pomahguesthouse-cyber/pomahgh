import React from 'react';
import { COMPONENT_PALETTE, DraggableComponent } from '@/types/page-editor';
import { useDraggable } from '@dnd-kit/core';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  LayoutTemplate, Square, Columns2, Columns3,
  Heading, AlignLeft, Image, Minus,
  MousePointerClick, List, Quote, Images,
  Sparkles, FileText, HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutTemplate,
  Square,
  Columns2,
  Columns3,
  Heading,
  AlignLeft,
  Image,
  Minus,
  MousePointerClick,
  List,
  Quote,
  Images,
  Sparkles,
  FileText,
  HelpCircle,
};

interface DraggableItemProps {
  component: DraggableComponent;
}

function DraggableItem({ component }: DraggableItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${component.type}`,
    data: { type: 'palette', component },
  });

  const Icon = iconMap[component.icon] || Square;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "flex flex-col items-center gap-1.5 p-3 rounded-lg border cursor-grab",
        "hover:bg-accent hover:border-primary/30 transition-colors",
        "bg-card text-card-foreground",
        isDragging && "opacity-50 cursor-grabbing"
      )}
    >
      <Icon className="h-5 w-5 text-muted-foreground" />
      <span className="text-xs text-center font-medium">{component.label}</span>
    </div>
  );
}

const categories = [
  { key: 'layout', label: 'Layout', color: 'text-blue-600' },
  { key: 'content', label: 'Konten', color: 'text-green-600' },
  { key: 'marketing', label: 'Marketing', color: 'text-purple-600' },
  { key: 'seo', label: 'SEO Blocks', color: 'text-orange-600' },
] as const;

export function ComponentPanel() {
  return (
    <div className="w-64 border-r bg-background flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-sm">Komponen</h2>
        <p className="text-xs text-muted-foreground mt-1">Drag & drop ke canvas</p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {categories.map(category => {
            const components = COMPONENT_PALETTE.filter(c => c.category === category.key);
            
            return (
              <div key={category.key}>
                <h3 className={cn("text-xs font-semibold uppercase tracking-wider mb-3", category.color)}>
                  {category.label}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {components.map(component => (
                    <DraggableItem key={component.type} component={component} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
