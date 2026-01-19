import React from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { EditorModeProvider, useEditorMode } from '@/contexts/EditorModeContext';
import { EditorPanel, LivePreview } from '@/components/admin/editor-mode';
import { Button } from '@/components/ui/button';
import { Save, RotateCcw, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Skeleton } from '@/components/ui/skeleton';

function EditorModeContent() {
  const { isDirty, saveChanges, resetChanges, isLoading } = useEditorMode();

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex">
        <div className="w-80 border-r p-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="flex-1 p-4">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-background border-b">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Editor Mode</h1>
          {isDirty && (
            <Badge variant="outline" className="gap-1 text-orange-600 border-orange-300 bg-orange-50">
              <AlertCircle className="h-3 w-3" />
              Unsaved changes
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetChanges}
            disabled={!isDirty}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button
            size="sm"
            onClick={saveChanges}
            disabled={!isDirty}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
            <EditorPanel />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={70}>
            <LivePreview />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

export default function AdminEditorMode() {
  return (
    <AdminLayout>
      <EditorModeProvider>
        <EditorModeContent />
      </EditorModeProvider>
    </AdminLayout>
  );
}
