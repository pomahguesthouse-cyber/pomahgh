import React from 'react';
import { cn } from '@/lib/utils';
import { useEditorMode } from '@/contexts/EditorModeContext';
import { DeviceType } from './EditorTopBar';
import { EditorPreviewPage } from './EditorPreviewPage';

interface EditableCanvasProps {
  device: DeviceType;
}

const DEVICE_SIZES: Record<DeviceType, { width: string; maxWidth: string }> = {
  desktop: { width: '100%', maxWidth: '100%' },
  tablet: { width: '768px', maxWidth: '768px' },
  mobile: { width: '375px', maxWidth: '375px' },
};

export function EditableCanvas({ device }: EditableCanvasProps) {
  const { setSelectedWidget, setHoveredWidget } = useEditorMode();
  const deviceStyle = DEVICE_SIZES[device];

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Only deselect if clicking directly on canvas background
    if (e.target === e.currentTarget) {
      setSelectedWidget(null);
      setHoveredWidget(null);
    }
  };

  return (
    <div 
      className={cn(
        'flex-1 overflow-auto bg-muted/30',
        device !== 'desktop' && 'flex justify-center p-6'
      )}
      onClick={handleCanvasClick}
    >
      {/* CSS override to convert fixed positioning to absolute within editor */}
      <style>
        {`
          .editor-preview-container .fixed,
          .editor-preview-container [class*="fixed"] {
            position: absolute !important;
          }
          .editor-preview-container {
            contain: layout paint;
          }
        `}
      </style>
      
      <div
        className={cn(
          'bg-background transition-all duration-300',
          device === 'desktop' && 'min-h-full',
          device !== 'desktop' && 'shadow-2xl rounded-xl overflow-hidden border-8 border-gray-800'
        )}
        style={{
          width: deviceStyle.width,
          maxWidth: deviceStyle.maxWidth,
          margin: device !== 'desktop' ? '0 auto' : undefined,
        }}
      >
        {/* Mobile notch */}
        {device === 'mobile' && (
          <div className="h-7 bg-gray-800 flex justify-center items-end pb-1.5">
            <div className="w-20 h-1.5 bg-gray-600 rounded-full" />
          </div>
        )}
        
        {/* Isolated preview container */}
        <div 
          className="editor-preview-container relative"
          style={{ 
            transform: 'translateZ(0)',
            isolation: 'isolate',
            minHeight: device === 'desktop' ? '100%' : 'calc(100vh - 180px)',
            maxHeight: device !== 'desktop' ? 'calc(100vh - 180px)' : undefined,
            overflowY: device !== 'desktop' ? 'auto' : undefined,
          }}
        >
          <EditorPreviewPage />
        </div>
      </div>
    </div>
  );
}
