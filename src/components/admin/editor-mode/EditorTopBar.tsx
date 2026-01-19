import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { 
  Save, 
  RotateCcw, 
  Undo2, 
  Redo2, 
  Monitor, 
  Tablet, 
  Smartphone,
  X,
  AlertCircle
} from 'lucide-react';
import { useEditorMode } from '@/contexts/EditorModeContext';
import { useNavigate } from 'react-router-dom';

export type DeviceType = 'desktop' | 'tablet' | 'mobile';

interface EditorTopBarProps {
  device: DeviceType;
  onDeviceChange: (device: DeviceType) => void;
}

export function EditorTopBar({ device, onDeviceChange }: EditorTopBarProps) {
  const { 
    isDirty, 
    saveChanges, 
    resetChanges, 
    undo, 
    redo, 
    canUndo, 
    canRedo,
    isSaving
  } = useEditorMode();
  const navigate = useNavigate();

  const handleExit = () => {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to exit?');
      if (!confirmed) return;
    }
    navigate('/admin/dashboard');
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-background border-b">
      {/* Left section: Undo/Redo */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="h-4 w-4" />
        </Button>

        {isDirty && (
          <Badge variant="outline" className="gap-1 text-orange-600 border-orange-300 bg-orange-50 ml-2">
            <AlertCircle className="h-3 w-3" />
            Unsaved changes
          </Badge>
        )}
      </div>

      {/* Center section: Device toggle */}
      <ToggleGroup 
        type="single" 
        value={device} 
        onValueChange={(value) => value && onDeviceChange(value as DeviceType)}
        className="bg-muted rounded-lg p-1"
      >
        <ToggleGroupItem value="desktop" aria-label="Desktop view" className="px-3">
          <Monitor className="h-4 w-4 mr-2" />
          Desktop
        </ToggleGroupItem>
        <ToggleGroupItem value="tablet" aria-label="Tablet view" className="px-3">
          <Tablet className="h-4 w-4 mr-2" />
          Tablet
        </ToggleGroupItem>
        <ToggleGroupItem value="mobile" aria-label="Mobile view" className="px-3">
          <Smartphone className="h-4 w-4 mr-2" />
          Mobile
        </ToggleGroupItem>
      </ToggleGroup>

      {/* Right section: Save/Reset/Exit */}
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
          disabled={!isDirty || isSaving}
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExit}
          title="Exit Editor"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
