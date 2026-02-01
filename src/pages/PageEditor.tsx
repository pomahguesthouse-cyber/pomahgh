import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DndContext, DragOverlay, closestCenter, DragStartEvent, DragEndEvent, DragOverEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { PageEditorProvider, usePageEditor } from '@/contexts/PageEditorContext';
import { IconSidebar, PanelType } from '@/components/page-editor/IconSidebar';
import { SectionPanel } from '@/components/page-editor/SectionPanel';
import { ElementsPanel } from '@/components/page-editor/ElementsPanel';
import { WixEditorTopBar } from '@/components/page-editor/WixEditorTopBar';
import { WixEditorCanvas } from '@/components/page-editor/WixEditorCanvas';
import { PropertiesPanel } from '@/components/page-editor/PropertiesPanel';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { DraggableComponent } from '@/types/page-editor';
import { SectionTemplate } from '@/types/section-templates';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function EditorContent() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: authLoading } = useAdminCheck();
  const [activeComponent, setActiveComponent] = useState<DraggableComponent | null>(null);
  const [activePanel, setActivePanel] = useState<PanelType | null>('add-section');
  
  const { 
    isLoading, 
    setIsDragging, 
    addComponent, 
    moveComponent,
    addSectionWithComponent,
    addSectionFromTemplate,
    schema 
  } = usePageEditor();

  // Configure sensors with activation constraint to prevent accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    setIsDragging(true);
    const activeData = event.active.data.current;
    if (activeData?.type === 'palette') {
      setActiveComponent(activeData.component as DraggableComponent);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false);
    setActiveComponent(null);
    
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Dropping section template
    if (activeData?.type === 'section-template') {
      const template = activeData.template as SectionTemplate;
      addSectionFromTemplate(template);
      return;
    }

    // Dropping from palette
    if (activeData?.type === 'palette') {
      const component = activeData.component as DraggableComponent;
      
      // Drop to section
      if (overData?.type === 'section') {
        const sectionId = overData.sectionId as string;
        addComponent(sectionId, component);
        return;
      }
      
      // Drop to canvas (auto-create section if needed)
      if (overData?.type === 'canvas' || over.id === 'canvas-drop-zone') {
        if (schema.sections.length === 0) {
          addSectionWithComponent(component);
        } else {
          addComponent(schema.sections[0].id, component);
        }
        return;
      }
    }

    // Moving existing component
    if (activeData?.type === 'component' && overData?.type === 'section') {
      const componentId = active.id as string;
      const targetSectionId = overData.sectionId as string;
      const sourceSectionId = activeData.sectionId as string;
      
      if (sourceSectionId !== targetSectionId) {
        const targetSection = schema.sections.find(s => s.id === targetSectionId);
        const index = targetSection?.components.length || 0;
        moveComponent(componentId, targetSectionId, index);
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Can be used for visual feedback during drag
  };

  if (authLoading || isLoading) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="h-12 border-b flex items-center justify-between px-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-8 w-40" />
        </div>
        <div className="flex-1 flex">
          <Skeleton className="w-14 h-full" />
          <Skeleton className="w-[320px] h-full" />
          <Skeleton className="flex-1 m-6" />
          <Skeleton className="w-72 h-full" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  // Render the appropriate panel based on activePanel
  const renderPanel = () => {
    switch (activePanel) {
      case 'add-section':
        return <SectionPanel onClose={() => setActivePanel(null)} />;
      case 'elements':
        return <ElementsPanel onClose={() => setActivePanel(null)} title="Elements" />;
      case 'text':
        return <ElementsPanel onClose={() => setActivePanel(null)} filterCategory="content" title="Text" />;
      case 'media':
        return <ElementsPanel onClose={() => setActivePanel(null)} filterCategory="content" title="Media" />;
      case 'design':
        return <ElementsPanel onClose={() => setActivePanel(null)} filterCategory="marketing" title="Design" />;
      default:
        return null;
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <div className="h-screen flex flex-col overflow-hidden bg-background">
        <WixEditorTopBar />
        
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Icon sidebar + Panel */}
          <IconSidebar 
            activePanel={activePanel} 
            onPanelChange={setActivePanel} 
          />
          {renderPanel()}
          
          {/* Center: Canvas */}
          <WixEditorCanvas />
          
          {/* Right: Properties Panel */}
          <PropertiesPanel />
        </div>
      </div>
      
      <DragOverlay dropAnimation={null}>
        {activeComponent && (
          <div className={cn(
            "flex flex-col items-center gap-1.5 p-3 rounded-lg border",
            "bg-primary/10 border-primary shadow-lg",
            "cursor-grabbing opacity-90"
          )}>
            <span className="text-sm font-medium">{activeComponent.label}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

export default function PageEditorPage() {
  return (
    <PageEditorProvider>
      <EditorContent />
    </PageEditorProvider>
  );
}
