import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DndContext, DragOverlay, closestCenter, DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { PageEditorProvider, usePageEditor } from '@/contexts/PageEditorContext';
import { ComponentPanel } from '@/components/page-editor/ComponentPanel';
import { EditorTopBar } from '@/components/page-editor/EditorTopBar';
import { EditorCanvas } from '@/components/page-editor/EditorCanvas';
import { PropertiesPanel } from '@/components/page-editor/PropertiesPanel';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { DraggableComponent } from '@/types/page-editor';
import { Skeleton } from '@/components/ui/skeleton';

function EditorContent() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: authLoading } = useAdminCheck();
  const { 
    isLoading, 
    setIsDragging, 
    addComponent, 
    moveComponent,
    schema 
  } = usePageEditor();

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        // undo handled by context
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        // redo handled by context
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    setIsDragging(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false);
    
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Dropping from palette
    if (activeData?.type === 'palette' && overData?.type === 'section') {
      const component = activeData.component as DraggableComponent;
      const sectionId = overData.sectionId as string;
      addComponent(sectionId, component);
    }

    // Moving existing component
    if (activeData?.type === 'component' && overData?.type === 'section') {
      const componentId = active.id as string;
      const targetSectionId = overData.sectionId as string;
      const sourceSectionId = activeData.sectionId as string;
      
      if (sourceSectionId !== targetSectionId) {
        // Find target index
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
      <div className="h-screen flex flex-col">
        <div className="h-14 border-b flex items-center justify-between px-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-8 w-40" />
        </div>
        <div className="flex-1 flex">
          <Skeleton className="w-64 h-full" />
          <Skeleton className="flex-1 m-6" />
          <Skeleton className="w-72 h-full" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // useAdminCheck handles redirect
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <div className="h-screen flex flex-col overflow-hidden bg-background">
        <EditorTopBar />
        
        <div className="flex-1 flex overflow-hidden">
          <ComponentPanel />
          <EditorCanvas />
          <PropertiesPanel />
        </div>
      </div>
      
      <DragOverlay>
        {/* Optional: render a preview of the dragged component */}
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
