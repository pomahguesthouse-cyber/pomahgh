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
        'flex-1 overflow-auto bg-muted/50',
        device !== 'desktop' && 'flex justify-center py-4'
      )}
      onClick={handleCanvasClick}
    >
      <div
        className={cn(
          'bg-background transition-all duration-300 min-h-full',
          device !== 'desktop' && 'shadow-2xl rounded-lg overflow-hidden border'
        )}
        style={{
          width: deviceStyle.width,
          maxWidth: deviceStyle.maxWidth,
          margin: device !== 'desktop' ? '0 auto' : undefined,
        }}
      >
        <EditorPreviewPage />
      </div>
    </div>
  );
}
