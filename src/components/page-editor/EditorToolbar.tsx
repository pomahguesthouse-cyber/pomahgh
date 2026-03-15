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
  Layers,
  Menu,
  PanelLeft,
  PanelRight,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EditorToolbarProps {
  onSave: () => void;
  onPreview: () => void;
  onOpenSettings: () => void;
  showLeftPanel?: boolean;
  showRightPanel?: boolean;
  onToggleLeftPanel?: () => void;
  onToggleRightPanel?: () => void;
}

export function EditorToolbar({
  onSave,
  onPreview,
  onOpenSettings,
  showLeftPanel,
  showRightPanel,
  onToggleLeftPanel,
  onToggleRightPanel,
}: EditorToolbarProps) {
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
    showLayerPanel,
    setShowLayerPanel,
  } = useEditorStore();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div className="h-12 md:h-14 border-b border-border bg-background flex items-center justify-between px-2 md:px-4">
      {/* Left Section */}
      <div className="flex items-center gap-1 md:gap-3 min-w-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/admin/landing-pages")}
          className="h-8 w-8 p-0 md:w-auto md:px-3 md:gap-2 shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden md:inline">Back</span>
        </Button>

        <div className="h-6 w-px bg-border hidden md:block" />

        <div className="flex items-center gap-1 min-w-0">
          <span className="text-xs md:text-sm font-medium text-foreground truncate max-w-[80px] md:max-w-[200px]">
            {pageSettings.title}
          </span>
          <Badge
            variant={pageSettings.status === "published" ? "default" : "secondary"}
            className="text-[10px] md:text-xs hidden sm:inline-flex"
          >
            {pageSettings.status}
          </Badge>
          {hasUnsavedChanges && (
            <Badge
              variant="outline"
              className="text-[10px] md:text-xs text-warning border-warning/50 hidden sm:inline-flex"
            >
              Unsaved
            </Badge>
          )}
        </div>
      </div>

      {/* Center Section - View Mode */}
      <div className="hidden sm:flex items-center gap-1 bg-muted rounded-lg p-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === "desktop" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("desktop")}
                className="h-7 w-7 md:h-8 md:w-8 p-0"
              >
                <Monitor className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Desktop</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === "tablet" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("tablet")}
                className="h-7 w-7 md:h-8 md:w-8 p-0"
              >
                <Tablet className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Tablet</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === "mobile" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("mobile")}
                className="h-7 w-7 md:h-8 md:w-8 p-0"
              >
                <Smartphone className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Mobile</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-1 md:gap-2">
        {/* Undo/Redo - always visible */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={undo}
            disabled={!canUndo}
            className="h-7 w-7 md:h-8 md:w-8 p-0"
          >
            <Undo2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={redo}
            disabled={!canRedo}
            className="h-7 w-7 md:h-8 md:w-8 p-0"
          >
            <Redo2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </Button>
        </div>

        <div className="h-6 w-px bg-border hidden md:block" />

        {/* Panel toggles - mobile only */}
        <div className="flex md:hidden items-center gap-0.5">
          {onToggleLeftPanel && (
            <Button
              variant={showLeftPanel ? "secondary" : "ghost"}
              size="sm"
              onClick={onToggleLeftPanel}
              className="h-7 w-7 p-0"
            >
              <PanelLeft className="h-3.5 w-3.5" />
            </Button>
          )}
          {onToggleRightPanel && (
            <Button
              variant={showRightPanel ? "secondary" : "ghost"}
              size="sm"
              onClick={onToggleRightPanel}
              className="h-7 w-7 p-0"
            >
              <PanelRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Desktop buttons */}
        <div className="hidden md:flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showLayerPanel ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setShowLayerPanel(!showLayerPanel)}
                  className="gap-2"
                >
                  <Layers className="h-4 w-4" />
                  Layers
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle Layer Panel</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button variant="outline" size="sm" onClick={onOpenSettings} className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Button>

          <Button variant="outline" size="sm" onClick={onPreview} className="gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </Button>
        </div>

        {/* Save button - always visible */}
        <Button size="sm" onClick={onSave} disabled={isSaving} className="h-7 md:h-8 gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3">
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">Save</span>
        </Button>

        {/* Mobile overflow menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 md:hidden">
              <Menu className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setViewMode("desktop")}>
              <Monitor className="h-4 w-4 mr-2" />
              Desktop View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setViewMode("tablet")}>
              <Tablet className="h-4 w-4 mr-2" />
              Tablet View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setViewMode("mobile")}>
              <Smartphone className="h-4 w-4 mr-2" />
              Mobile View
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowLayerPanel(!showLayerPanel)}>
              <Layers className="h-4 w-4 mr-2" />
              {showLayerPanel ? "Hide" : "Show"} Layers
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenSettings}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onPreview}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
