import React, { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { EditorModeProvider, useEditorMode } from '@/contexts/EditorModeContext';
import { EditorTopBar, DeviceType } from '@/components/admin/editor-mode/EditorTopBar';
import { EditableCanvas } from '@/components/admin/editor-mode/EditableCanvas';
import { CollapsiblePanel } from '@/components/admin/editor-mode/CollapsiblePanel';
import { useKeyboardShortcuts } from '@/components/admin/editor-mode/hooks/useKeyboardShortcuts';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

function EditorModeContent() {
  const { isLoading, panelOpen, setPanelOpen } = useEditorMode();
  const [device, setDevice] = useState<DeviceType>('desktop');
  
  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col">
        <div className="h-14 border-b flex items-center justify-between px-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-8 w-40" />
        </div>
        <div className="flex-1 p-4">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-muted/30">
      {/* Top Bar */}
      <EditorTopBar device={device} onDeviceChange={setDevice} />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative flex">
        <EditableCanvas device={device} />

        {/* Floating settings button */}
        {!panelOpen && (
          <Button
            className="fixed right-4 top-20 z-[70] shadow-lg"
            size="sm"
            onClick={() => setPanelOpen(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        )}

        {/* Collapsible Panel */}
        <CollapsiblePanel 
          isOpen={panelOpen} 
          onClose={() => setPanelOpen(false)} 
        />
      </div>
    </div>
  );
}

export default function AdminEditorMode() {
  return (
    <EditorModeProvider>
      <EditorModeContent />
    </EditorModeProvider>
  );
}
