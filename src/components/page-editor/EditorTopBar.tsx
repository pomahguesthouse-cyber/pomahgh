import React, { useState } from 'react';
import { usePageEditor } from '@/contexts/PageEditorContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Save, 
  Globe, 
  ExternalLink, 
  Undo2, 
  Redo2,
  Monitor,
  Tablet,
  Smartphone,
  Settings,
  ChevronLeft,
  Loader2,
  Eye,
  Tag
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export function EditorTopBar() {
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
  } = usePageEditor();

  const [showSeoSettings, setShowSeoSettings] = useState(false);

  const devices = [
    { key: 'desktop', icon: Monitor, label: 'Desktop' },
    { key: 'tablet', icon: Tablet, label: 'Tablet' },
    { key: 'mobile', icon: Smartphone, label: 'Mobile' },
  ] as const;

  const handlePreview = () => {
    if (currentPage) {
      window.open(`/${currentPage.slug}`, '_blank');
    }
  };

  return (
    <div className="h-14 border-b bg-background flex items-center justify-between px-4 gap-4">
      {/* Left Section - Back & Page Selector */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/landing-pages">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        
        <Separator orientation="vertical" className="h-6" />
        
        <Select 
          value={currentPage?.id || ''} 
          onValueChange={(id) => {
            const page = pages.find(p => p.id === id);
            setCurrentPage(page || null);
          }}
        >
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Pilih halaman..." />
          </SelectTrigger>
          <SelectContent>
            {pages.map(page => (
              <SelectItem key={page.id} value={page.id}>
                <div className="flex items-center gap-2">
                  <span>{page.page_title}</span>
                  <Badge variant={page.status === 'published' ? 'default' : 'secondary'} className="text-xs">
                    {page.status === 'published' ? 'Published' : 'Draft'}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {currentPage && (
          <Badge variant="outline" className="text-xs">
            /{currentPage.slug}
          </Badge>
        )}

        {hasUnsavedChanges && (
          <Badge variant="secondary" className="text-xs">
            Belum disimpan
          </Badge>
        )}
      </div>

      {/* Center Section - Device Toggle & Undo/Redo */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-muted rounded-md p-1">
          {devices.map(({ key, icon: Icon, label }) => (
            <Button
              key={key}
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-3",
                editorState.device === key && "bg-background shadow-sm"
              )}
              onClick={() => setDevice(key)}
              title={label}
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>

        <Separator orientation="vertical" className="h-6 mx-2" />

        <Button
          variant="ghost"
          size="icon"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Right Section - SEO Settings & Actions */}
      <div className="flex items-center gap-2">
        {currentPage && (
          <>
            <Popover open={showSeoSettings} onOpenChange={setShowSeoSettings}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Tag className="h-4 w-4" />
                  SEO
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96" align="end">
                <div className="space-y-4">
                  <h4 className="font-medium">Pengaturan SEO</h4>
                  
                  <div className="space-y-2">
                    <Label>Slug URL</Label>
                    <Input 
                      value={currentPage.slug}
                      onChange={(e) => updatePageMetadata({ slug: e.target.value })}
                      placeholder="slug-halaman"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Primary Keyword</Label>
                    <Input 
                      value={currentPage.primary_keyword}
                      onChange={(e) => updatePageMetadata({ primary_keyword: e.target.value })}
                      placeholder="keyword utama"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Secondary Keywords</Label>
                    <Textarea 
                      value={currentPage.secondary_keywords?.join(', ') || ''}
                      onChange={(e) => updatePageMetadata({ 
                        secondary_keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean)
                      })}
                      placeholder="keyword 1, keyword 2, keyword 3"
                      rows={2}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Meta Description</Label>
                    <Textarea 
                      value={currentPage.meta_description || ''}
                      onChange={(e) => updatePageMetadata({ meta_description: e.target.value })}
                      placeholder="Deskripsi untuk Google..."
                      rows={3}
                      maxLength={160}
                    />
                    <p className="text-xs text-muted-foreground">
                      {(currentPage.meta_description?.length || 0)}/160 karakter
                    </p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={handlePreview}
            >
              <Eye className="h-4 w-4" />
              Preview
            </Button>

            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={savePage}
              disabled={isSaving || !hasUnsavedChanges}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Simpan
            </Button>

            <Button 
              size="sm" 
              className="gap-2"
              onClick={publishPage}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Globe className="h-4 w-4" />
              )}
              Publish
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
