import React from 'react';
import { COMPONENT_PALETTE, DraggableComponent } from '@/types/page-editor';
import { useDraggable } from '@dnd-kit/core';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
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

interface ElementsPanelProps {
  onClose: () => void;
  filterCategory?: 'layout' | 'content' | 'marketing' | 'seo';
  title?: string;
}

function DraggableItem({ component }: { component: DraggableComponent }) {
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
        "flex items-center gap-3 p-3 rounded-lg border cursor-grab",
        "hover:bg-accent hover:border-primary/30 transition-colors",
        "bg-card text-card-foreground",
        isDragging && "opacity-50 cursor-grabbing"
      )}
    >
      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <span className="text-sm font-medium">{component.label}</span>
    </div>
  );
}

const categories = [
  { key: 'layout', label: 'Layout', color: 'text-blue-600' },
  { key: 'content', label: 'Konten', color: 'text-green-600' },
  { key: 'marketing', label: 'Marketing', color: 'text-purple-600' },
  { key: 'seo', label: 'SEO Blocks', color: 'text-orange-600' },
] as const;

export function ElementsPanel({ onClose, filterCategory, title = 'Elements' }: ElementsPanelProps) {
  const filteredCategories = filterCategory 
    ? categories.filter(c => c.key === filterCategory)
    : categories;

  return (
    <div className="w-[280px] border-r bg-background flex flex-col h-full animate-in slide-in-from-left-2 duration-200">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">{title}</h2>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {filteredCategories.map(category => {
            const components = COMPONENT_PALETTE.filter(c => c.category === category.key);
            
            return (
              <div key={category.key}>
                <h3 className={cn("text-xs font-semibold uppercase tracking-wider mb-3", category.color)}>
                  {category.label}
                </h3>
                <div className="space-y-2">
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
