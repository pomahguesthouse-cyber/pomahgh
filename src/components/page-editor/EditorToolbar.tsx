import { Button } from "@/components/ui/button";
import {
  Undo2,
  Redo2,
  Monitor,
  Tablet,
  Smartphone,
  Save,
  Eye,
  Settings,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { useEditorStore } from "@/stores/editorStore";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface EditorToolbarProps {
  onSave: () => void;
  onPreview: () => void;
  onOpenSettings: () => void;
}

export function EditorToolbar({ onSave, onPreview, onOpenSettings }: EditorToolbarProps) {
  const navigate = useNavigate();
  const { 
    viewMode, 
    setViewMode, 
    undo, 
    redo, 
    history, 
    historyIndex,
    isSaving,
    hasUnsavedChanges,
    pageSettings,
  } = useEditorStore();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div className="h-14 border-b border-border bg-background flex items-center justify-between px-4">
      {/* Left Section */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/admin/landing-pages")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        
        <div className="h-6 w-px bg-border" />
        
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
            {pageSettings.title}
          </span>
          <Badge variant={pageSettings.status === 'published' ? 'default' : 'secondary'} className="text-xs">
            {pageSettings.status}
          </Badge>
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-xs text-warning border-warning/50">
              Unsaved
            </Badge>
          )}
        </div>
      </div>

      {/* Center Section - View Mode */}
      <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === 'desktop' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('desktop')}
                className="h-8 w-8 p-0"
              >
                <Monitor className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Desktop</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === 'tablet' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('tablet')}
                className="h-8 w-8 p-0"
              >
                <Tablet className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Tablet</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === 'mobile' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('mobile')}
                className="h-8 w-8 p-0"
              >
                <Smartphone className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Mobile</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={undo}
                  disabled={!canUndo}
                  className="h-8 w-8 p-0"
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
                  size="sm"
                  onClick={redo}
                  disabled={!canRedo}
                  className="h-8 w-8 p-0"
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="h-6 w-px bg-border" />

        <Button variant="outline" size="sm" onClick={onOpenSettings} className="gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </Button>

        <Button variant="outline" size="sm" onClick={onPreview} className="gap-2">
          <Eye className="h-4 w-4" />
          Preview
        </Button>

        <Button size="sm" onClick={onSave} disabled={isSaving} className="gap-2">
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save
        </Button>
      </div>
    </div>
  );
}
