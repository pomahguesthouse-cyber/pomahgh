import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Monitor,
  Tablet,
  Smartphone,
  Save,
  Eye,
  Settings,
  Loader2,
  ChevronDown,
  FileText,
  Plus,
  ZoomIn,
  ZoomOut,
  Search,
  Undo2,
  Redo2,
  MoreHorizontal,
  Download,
  Upload,
  Trash2,
  Loader,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEditorStore } from "@/stores/editorStore";

interface TopBarProps {
  onSave: () => void;
  onPreview: () => void;
  onOpenSettings: () => void;
  onAddPage?: () => void;
}

const zoomLevels = [50, 75, 100, 125, 150, 200];

export function TopBar({
  onSave,
  onPreview,
  onOpenSettings,
  onAddPage,
}: TopBarProps) {
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
    zoom,
    setZoom,
  } = useEditorStore();

  const [showPageDropdown, setShowPageDropdown] = useState(false);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleZoomIn = useCallback(() => {
    const currentIndex = zoomLevels.indexOf(zoom);
    if (currentIndex < zoomLevels.length - 1) {
      setZoom(zoomLevels[currentIndex + 1]);
    }
  }, [zoom, setZoom]);

  const handleZoomOut = useCallback(() => {
    const currentIndex = zoomLevels.indexOf(zoom);
    if (currentIndex > 0) {
      setZoom(zoomLevels[currentIndex - 1]);
    }
  }, [zoom, setZoom]);

  return (
    <div className="h-12 bg-background border-b border-border flex items-center justify-between px-3 shrink-0">
      {/* Left Section */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/admin/page-editor")}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="h-5 w-px bg-border" />

        {/* Page Selector */}
        <DropdownMenu open={showPageDropdown} onOpenChange={setShowPageDropdown}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 h-8 px-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm max-w-[120px] truncate">
                {pageSettings.title || "Untitled Page"}
              </span>
              <Badge
                variant={pageSettings.status === "published" ? "default" : "secondary"}
                className="text-[10px] h-5"
              >
                {pageSettings.status}
              </Badge>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={onAddPage}>
              <Plus className="h-4 w-4 mr-2" />
              Add New Page
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <FileText className="h-4 w-4 mr-2" />
              Home Page
              {pageSettings.slug === "home" && (
                <Badge variant="outline" className="ml-auto text-[10px]">Current</Badge>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <FileText className="h-4 w-4 mr-2" />
              Rooms
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <FileText className="h-4 w-4 mr-2" />
              About
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {hasUnsavedChanges && (
          <Badge variant="outline" className="text-[10px] h-5 text-warning border-warning/50">
            Unsaved
          </Badge>
        )}
      </div>

      {/* Center Section - View Mode */}
      <div className="flex items-center gap-1 bg-muted/80 rounded-lg p-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={viewMode === "desktop" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("desktop")}
              className="h-7 w-7 p-0"
            >
              <Monitor className="h-3.5 w-3.5" />
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
              className="h-7 w-7 p-0"
            >
              <Tablet className="h-3.5 w-3.5" />
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
              className="h-7 w-7 p-0"
            >
              <Smartphone className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Mobile</TooltipContent>
        </Tooltip>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-1">
        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5">
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
            <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
          </Tooltip>
        </div>

        <div className="h-5 w-px bg-border mx-1" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= zoomLevels[0]}
                className="h-8 w-8 p-0"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom Out</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-14 px-0 text-xs font-medium">
                {zoom}%
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-20">
              {zoomLevels.map((level) => (
                <DropdownMenuItem
                  key={level}
                  onClick={() => setZoom(level)}
                  className={cn(zoom === level && "bg-accent")}
                >
                  {level}%
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= zoomLevels[zoomLevels.length - 1]}
                className="h-8 w-8 p-0"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom In</TooltipContent>
          </Tooltip>
        </div>

        <div className="h-5 w-px bg-border mx-1" />

        {/* Tools Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onOpenSettings}>
              <Settings className="h-4 w-4 mr-2" />
              Page Settings
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Download className="h-4 w-4 mr-2" />
              Export HTML
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Page
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Preview Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onPreview}
          className="h-8 gap-1.5 text-xs"
        >
          <Eye className="h-3.5 w-3.5" />
          Preview
        </Button>

        {/* Save Button */}
        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving}
          className="h-8 gap-1.5 text-xs px-3"
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Save
        </Button>
      </div>
    </div>
  );
}
