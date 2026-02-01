import React, { useState } from 'react';
import { usePageEditor } from '@/contexts/PageEditorContext';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Save, 
  Globe, 
  Undo2, 
  Redo2,
  Monitor,
  Smartphone,
  Loader2,
  Eye,
  ChevronDown,
  ZoomIn,
  Search,
  Wrench,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export function WixEditorTopBar() {
  const {
    pages,
    currentPage,
    setCurrentPage,
    savePage,
    publishPage,
    editorState,
    setDevice,
    undo,
    redo,
    canUndo,
    canRedo,
    updatePageMetadata,
    isSaving,
    hasUnsavedChanges,
    zoom,
    setZoom,
  } = usePageEditor();

  const [showSeoSettings, setShowSeoSettings] = useState(false);

  const handlePreview = () => {
    if (currentPage) {
      window.open(`/${currentPage.slug}`, '_blank');
    }
  };

  return (
    <div className="h-12 border-b bg-background flex items-center justify-between px-4 gap-4">
      {/* Left: Page selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Page:</span>
        <Select 
          value={currentPage?.id || ''} 
          onValueChange={(id) => {
            const page = pages.find(p => p.id === id);
            setCurrentPage(page || null);
          }}
        >
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Select page..." />
          </SelectTrigger>
          <SelectContent>
            {pages.map(page => (
              <SelectItem key={page.id} value={page.id}>
                {page.page_title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Device toggle */}
        <div className="flex items-center border rounded-md overflow-hidden">
          <button
            onClick={() => setDevice('desktop')}
            className={cn(
              "h-8 px-3 flex items-center justify-center transition-colors",
              editorState.device === 'desktop' ? "bg-accent" : "hover:bg-accent/50"
            )}
          >
            <Monitor className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDevice('mobile')}
            className={cn(
              "h-8 px-3 flex items-center justify-center transition-colors",
              editorState.device === 'mobile' ? "bg-accent" : "hover:bg-accent/50"
            )}
          >
            <Smartphone className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Center: Domain & status */}
      <div className="flex-1 flex items-center justify-center gap-2">
        {currentPage && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-sm">
            <Globe className="h-3.5 w-3.5" />
            <span className="text-muted-foreground">/{currentPage.slug}</span>
            {currentPage.status === 'draft' && (
              <span className="text-primary hover:underline cursor-pointer text-xs">
                Connect Domain
              </span>
            )}
          </div>
        )}

        {hasUnsavedChanges && (
          <Badge variant="secondary" className="text-xs">
            Unsaved
          </Badge>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Undo/Redo */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Zoom */}
        <Button variant="ghost" size="sm" className="gap-1 h-8 px-2">
          <ZoomIn className="h-4 w-4" />
          <span className="text-xs">{Math.round((zoom || 1) * 100)}%</span>
        </Button>

        {/* Tools dropdown */}
        <Button variant="ghost" size="sm" className="gap-1 h-8">
          <Wrench className="h-4 w-4" />
          <span className="text-xs">Tools</span>
        </Button>

        {/* Search */}
        <Button variant="ghost" size="sm" className="gap-1 h-8">
          <Search className="h-4 w-4" />
          <span className="text-xs">Search</span>
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Preview */}
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8"
          onClick={handlePreview}
        >
          <Eye className="h-4 w-4 mr-1" />
          Preview
        </Button>

        {/* Save */}
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8"
          onClick={savePage}
          disabled={isSaving || !hasUnsavedChanges}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Save className="h-4 w-4 mr-1" />
              Save
            </>
          )}
        </Button>

        {/* Publish */}
        <Button 
          size="sm" 
          className="h-8 bg-primary hover:bg-primary/90"
          onClick={publishPage}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Publish'
          )}
        </Button>
      </div>
    </div>
  );
}
