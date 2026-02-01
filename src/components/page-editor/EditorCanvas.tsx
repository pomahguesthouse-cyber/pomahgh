import React from 'react';
import { usePageEditor } from '@/contexts/PageEditorContext';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SectionRenderer } from './renderers/SectionRenderer';
import { Button } from '@/components/ui/button';
import { Plus, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export function EditorCanvas() {
  const { 
    schema, 
    currentPage,
    editorState, 
    addSection,
    setSelectedSection,
    setSelectedComponent 
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
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center space-y-4">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground/50" />
          <div>
            <h3 className="font-semibold text-lg">Tidak ada halaman dipilih</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Pilih halaman dari dropdown di atas untuk mulai mengedit
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-muted/30 overflow-hidden flex flex-col">
      <ScrollArea className="flex-1">
        <div className="p-6 flex justify-center min-h-full">
          <div 
            ref={setNodeRef}
            className={cn(
              "bg-background shadow-lg rounded-lg overflow-hidden transition-all duration-300",
              isOver && "ring-2 ring-primary ring-offset-2"
            )}
            style={{ 
              width: deviceWidths[editorState.device],
              maxWidth: '100%',
              minHeight: '600px'
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedComponent(null);
                setSelectedSection(null);
              }
            }}
          >
            {/* Page Header Preview */}
            <div className="p-6 border-b bg-gradient-to-r from-primary/10 to-primary/5">
              <h1 className="text-2xl font-bold">{currentPage.hero_headline}</h1>
              {currentPage.subheadline && (
                <p className="text-muted-foreground mt-2">{currentPage.subheadline}</p>
              )}
            </div>

            {/* Sections */}
            <SortableContext
              items={schema.sections.map(s => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {schema.sections.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-primary/30 m-4 rounded-lg bg-primary/5 min-h-[200px] flex flex-col items-center justify-center">
                  <p className="text-muted-foreground mb-4">
                    Drag komponen ke sini atau tambah section baru
                  </p>
                  <Button onClick={() => addSection()} variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Tambah Section
                  </Button>
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
                  
                  {/* Add Section Button */}
                  <div className="p-4 flex justify-center">
                    <Button 
                      onClick={() => addSection()} 
                      variant="outline" 
                      size="sm"
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Tambah Section
                    </Button>
                  </div>
                </>
              )}
            </SortableContext>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
