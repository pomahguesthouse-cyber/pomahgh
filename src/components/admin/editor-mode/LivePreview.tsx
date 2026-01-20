import React from 'react';
import { useEditorMode } from '@/contexts/EditorModeContext';
import { Button } from '@/components/ui/button';
import { Monitor, Tablet, Smartphone, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

const PREVIEW_SIZES = {
  desktop: { width: '100%', label: 'Desktop' },
  tablet: { width: '768px', label: 'Tablet' },
  mobile: { width: '375px', label: 'Mobile' },
};

export function LivePreview() {
  const { previewMode, setPreviewMode } = useEditorMode();

  const previewUrl = window.location.origin;

  return (
    <div className="h-full flex flex-col bg-muted/30">
      {/* Preview Controls */}
      <div className="flex items-center justify-between px-4 py-2 bg-background border-b">
        <div className="flex items-center gap-1">
          <Button
            variant={previewMode === 'desktop' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setPreviewMode('desktop')}
            className="h-8"
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <Button
            variant={previewMode === 'tablet' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setPreviewMode('tablet')}
            className="h-8"
          >
            <Tablet className="h-4 w-4" />
          </Button>
          <Button
            variant={previewMode === 'mobile' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setPreviewMode('mobile')}
            className="h-8"
          >
            <Smartphone className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {PREVIEW_SIZES[previewMode].label}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => window.open(previewUrl, '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Preview Frame */}
      <div className="flex-1 flex items-start justify-center p-4 overflow-auto">
        <div
          className={cn(
            "bg-background rounded-lg shadow-xl overflow-hidden transition-all duration-300",
            previewMode === 'desktop' && "w-full h-full",
            previewMode !== 'desktop' && "border"
          )}
          style={{
            width: PREVIEW_SIZES[previewMode].width,
            maxWidth: '100%',
            height: previewMode === 'desktop' ? '100%' : 'calc(100vh - 200px)',
          }}
        >
          <iframe
            src={previewUrl}
            className="w-full h-full"
            title="Live Preview"
          />
        </div>
      </div>
    </div>
  );
}












