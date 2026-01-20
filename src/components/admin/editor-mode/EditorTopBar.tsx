import React from 'react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { 
  Save, 
  Monitor, 
  Tablet, 
  Smartphone,
  ArrowLeft,
  Loader2,
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
    exitEditorMode,
    isSaving,
    undo,
    redo,
  } = useEditorMode();
  const navigate = useNavigate();
  const [saving, setSaving] = React.useState(false);

  const handleExit = () => {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to exit?');
      if (!confirmed) return;
    }
    exitEditorMode();
    navigate('/admin/dashboard');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveChanges();
    } finally {
      setSaving(false);
    }
  };

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty) handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, isDirty]);

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-background/95 backdrop-blur-sm border-b sticky top-0 z-[100]">
      {/* Left: Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleExit}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Back</span>
      </Button>

      {/* Center: Device Toggle */}
      <ToggleGroup 
        type="single" 
        value={device} 
        onValueChange={(value) => value && onDeviceChange(value as DeviceType)}
        className="bg-muted rounded-lg p-1"
      >
        <ToggleGroupItem value="desktop" aria-label="Desktop" className="px-3 h-8">
          <Monitor className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="tablet" aria-label="Tablet" className="px-3 h-8">
          <Tablet className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="mobile" aria-label="Mobile" className="px-3 h-8">
          <Smartphone className="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>

      {/* Right: Save Button */}
      <Button
        variant={isDirty ? 'default' : 'outline'}
        size="sm"
        onClick={handleSave}
        disabled={!isDirty || saving || isSaving}
        className="gap-2 min-w-[90px]"
      >
        {saving || isSaving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            {isDirty ? 'Save' : 'Saved'}
          </>
        )}
      </Button>
    </div>
  );
}












