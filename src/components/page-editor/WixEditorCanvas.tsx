import React from 'react';
import { usePageEditor } from '@/contexts/PageEditorContext';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SectionRenderer } from './renderers/SectionRenderer';
import { Button } from '@/components/ui/button';
import { Plus, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export function WixEditorCanvas() {
  const { 
    schema, 
    currentPage,
    editorState, 
    addSection,
    setSelectedSection,
    setSelectedComponent,
    isDragging,
  } = usePageEditor();

  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-drop-zone',
    data: { type: 'canvas' },
  });

  const deviceWidths = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px',
  };

  if (!currentPage) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/50">
        <div className="text-center space-y-4">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground/50" />
          <div>
            <h3 className="font-semibold text-lg">No page selected</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Select a page from the dropdown above to start editing
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-muted/50 overflow-hidden flex flex-col">
      <ScrollArea className="flex-1">
        <div className="py-8 px-6 flex justify-center min-h-full">
          <div 
            ref={setNodeRef}
            className={cn(
              "bg-background shadow-xl transition-all duration-300 relative",
              isOver && "ring-2 ring-primary ring-offset-4"
            )}
            style={{ 
              width: deviceWidths[editorState.device],
              maxWidth: editorState.device === 'desktop' ? '1200px' : undefined,
              minHeight: '100vh'
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedComponent(null);
                setSelectedSection(null);
              }
            }}
          >
            {/* Mock header preview */}
            <div className="h-16 bg-gradient-to-r from-foreground/90 to-foreground flex items-center justify-between px-6">
              <div className="text-background font-semibold italic text-lg">
                Pomah
              </div>
              <div className="flex gap-6 text-background/80 text-sm">
                <span>Home</span>
                <span>Tentang Pomah</span>
                <span>Activities</span>
                <span>Contact</span>
                <span className="text-primary-foreground bg-primary/30 px-3 py-1 rounded">Book Guesthouse</span>
              </div>
            </div>

            {/* Drop zone indicator - shown when dragging */}
            {isDragging && schema.sections.length === 0 && (
              <div className="absolute inset-x-0 top-16 mx-4 mt-4 border-2 border-dashed border-primary/50 rounded-lg bg-primary/5 h-24 flex items-center justify-center text-primary transition-all animate-pulse">
                Choose a section and drop it anywhere on the page...
              </div>
            )}

            {/* Sections */}
            <SortableContext
              items={schema.sections.map(s => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {schema.sections.length === 0 ? (
                <div className="p-4 mt-16">
                  <div className="border-2 border-dashed border-primary/30 rounded-lg bg-primary/5 min-h-[200px] flex flex-col items-center justify-center">
                    <p className="text-muted-foreground text-sm mb-4">
                      Choose a section from the left panel to get started
                    </p>
                    <Button onClick={() => addSection()} variant="outline" size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Blank Section
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {schema.sections.map((section, index) => (
                    <SectionRenderer 
                      key={section.id} 
                      section={section}
                      index={index}
                    />
                  ))}
                  
                  {/* Add Section indicator */}
                  <div className="p-6 flex justify-center">
                    <Button 
                      onClick={() => addSection()} 
                      variant="outline" 
                      size="sm"
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Section
                    </Button>
                  </div>
                </>
              )}
            </SortableContext>

            {/* Mock footer preview */}
            <div className="bg-foreground text-background py-8 px-6 mt-8">
              <div className="text-center text-background/60 text-sm">
                © 2025 Pomah Guesthouse. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
