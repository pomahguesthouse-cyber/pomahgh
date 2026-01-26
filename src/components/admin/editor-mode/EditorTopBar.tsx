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
  Undo2,
  Redo2,
  Check,
  AlertCircle
} from 'lucide-react';
import { useEditorMode } from '@/contexts/EditorModeContext';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

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
    canUndo,
    canRedo,
  } = useEditorMode();
  const navigate = useNavigate();
  const [saving, setSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  const handleExit = () => {
    if (isDirty) {
      const confirmed = window.confirm('Anda memiliki perubahan yang belum disimpan. Yakin ingin keluar?');
      if (!confirmed) return;
    }
    exitEditorMode();
    navigate('/admin/dashboard');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveChanges();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
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
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        redo();
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
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center justify-between px-4 py-2 bg-background/95 backdrop-blur-sm border-b sticky top-0 z-[100]">
        {/* Left: Back Button + Undo/Redo */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExit}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Kembali</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Kembali ke Dashboard</TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-border hidden sm:block" />

          {/* Undo/Redo buttons */}
          <div className="hidden sm:flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={undo}
                  disabled={!canUndo}
                  className="h-8 w-8"
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={redo}
                  disabled={!canRedo}
                  className="h-8 w-8"
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Center: Device Toggle */}
        <ToggleGroup 
          type="single" 
          value={device} 
          onValueChange={(value) => value && onDeviceChange(value as DeviceType)}
          className="bg-muted rounded-lg p-1"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem value="desktop" aria-label="Desktop" className="px-3 h-8">
                <Monitor className="h-4 w-4" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>Desktop</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem value="tablet" aria-label="Tablet" className="px-3 h-8">
                <Tablet className="h-4 w-4" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>Tablet</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem value="mobile" aria-label="Mobile" className="px-3 h-8">
                <Smartphone className="h-4 w-4" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>Mobile</TooltipContent>
          </Tooltip>
        </ToggleGroup>

        {/* Right: Save Status + Button */}
        <div className="flex items-center gap-2">
          {/* Dirty indicator */}
          {isDirty && !saving && !isSaving && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-warning">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Belum disimpan</span>
            </div>
          )}

          {/* Success indicator */}
          {saveSuccess && !isDirty && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-success">
              <Check className="h-3.5 w-3.5" />
              <span>Tersimpan</span>
            </div>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isDirty ? 'default' : 'outline'}
                size="sm"
                onClick={handleSave}
                disabled={!isDirty || saving || isSaving}
                className={cn(
                  "gap-2 min-w-[100px] transition-all",
                  isDirty && "animate-pulse-subtle"
                )}
              >
                {saving || isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Menyimpan</span>
                  </>
                ) : saveSuccess && !isDirty ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Tersimpan</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>{isDirty ? 'Simpan' : 'Tersimpan'}</span>
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Simpan Perubahan (Ctrl+S)</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
