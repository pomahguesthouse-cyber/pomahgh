import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { X, Info, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  SECTION_CATEGORIES, 
  SECTION_TEMPLATES,
  getTemplatesByCategory,
  SectionCategory,
  SectionTemplate 
} from '@/types/section-templates';
import { usePageEditor } from '@/contexts/PageEditorContext';
import { useDraggable } from '@dnd-kit/core';

interface SectionPanelProps {
  onClose: () => void;
}

function SectionTemplateThumbnail({ template, onAdd }: { template: SectionTemplate; onAdd: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `template-${template.id}`,
    data: { type: 'section-template', template },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "group relative bg-card border rounded-lg overflow-hidden cursor-grab transition-all",
        "hover:border-primary/50 hover:shadow-md",
        isDragging && "opacity-50 cursor-grabbing"
      )}
      onClick={onAdd}
    >
      {/* Thumbnail preview */}
      <div 
      className={cn(
        "h-24 bg-gradient-to-br flex items-center justify-center",
        template.previewColor
      )}
    >
      <div className="text-center px-3">
        <p className="text-xs font-medium text-muted-foreground truncate">{template.name}</p>
      </div>
    </div>
      
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
    </div>
  );
}

export function SectionPanel({ onClose }: SectionPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<SectionCategory>('welcome');
  const { addSectionFromTemplate, schema } = usePageEditor();
  
  const templates = getTemplatesByCategory(selectedCategory);

  const handleAddTemplate = (template: SectionTemplate) => {
    addSectionFromTemplate(template);
  };

  return (
    <div className="w-[320px] border-r bg-background flex flex-col h-full animate-in slide-in-from-left-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Add Section</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Info className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Category list */}
        <ScrollArea className="w-[120px] border-r">
          <div className="py-2">
            {/* Blank Section - Special */}
            <button
              onClick={() => setSelectedCategory('blank')}
              className={cn(
                "w-full text-left px-3 py-2 text-sm transition-colors",
                selectedCategory === 'blank' 
                  ? "bg-primary text-primary-foreground font-medium" 
                  : "text-primary hover:bg-accent"
              )}
            >
              + Blank Section
            </button>

            {/* Generate Section - AI */}
            <button
              className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-accent transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generate Section
            </button>

            <div className="h-px bg-border my-2" />

            {/* Regular categories */}
            {SECTION_CATEGORIES.filter(c => c.key !== 'blank').map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm transition-colors",
                  selectedCategory === cat.key 
                    ? "bg-primary/10 text-primary font-medium border-l-2 border-primary" 
                    : "text-foreground hover:bg-accent"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </ScrollArea>

        {/* Templates grid */}
        <ScrollArea className="flex-1">
          <div className="p-3">
            <h3 className="text-sm font-medium mb-3 capitalize">
              {selectedCategory === 'blank' ? 'Start Fresh' : selectedCategory}
            </h3>
            
            <div className="grid gap-3">
              {templates.length === 0 && selectedCategory === 'blank' && (
                <button
                  onClick={() => handleAddTemplate(SECTION_TEMPLATES.find(t => t.id === 'blank-section')!)}
                  className="h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <span className="text-2xl">+</span>
                  <span className="text-xs">Add Blank Section</span>
                </button>
              )}
              
              {templates.map((template) => (
                <SectionTemplateThumbnail 
                  key={template.id} 
                  template={template} 
                  onAdd={() => handleAddTemplate(template)}
                />
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
