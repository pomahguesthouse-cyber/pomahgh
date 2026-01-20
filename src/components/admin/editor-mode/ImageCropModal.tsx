import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useEditorImageUpload } from '@/hooks/useEditorImageUpload';
import { Loader2, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageCropModalProps {
  src: string;
  onCrop: (croppedUrl: string) => void;
  onClose: () => void;
}

interface CropSelection {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function ImageCropModal({ src, onCrop, onClose }: ImageCropModalProps) {
  const { uploadFromBlob, uploading } = useEditorImageUpload();
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [selection, setSelection] = useState<CropSelection>({ x: 0, y: 0, width: 100, height: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Initialize selection when image loads
  useEffect(() => {
    if (imageLoaded && imageRef.current && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const imgRect = imageRef.current.getBoundingClientRect();
      
      // Center the initial selection (50% of image)
      const selectionWidth = Math.min(imgRect.width * 0.8, containerRect.width * 0.8);
      const selectionHeight = Math.min(imgRect.height * 0.8, containerRect.height * 0.8);
      
      setSelection({
        x: (containerRect.width - selectionWidth) / 2,
        y: (containerRect.height - selectionHeight) / 2,
        width: selectionWidth,
        height: selectionHeight,
      });
    }
  }, [imageLoaded]);

  const handleImageLoad = () => {
    if (imageRef.current) {
      setImageDimensions({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight,
      });
      setImageLoaded(true);
    }
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, action: 'move' | string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (action === 'move') {
      setIsDragging(true);
    } else {
      setIsResizing(action);
    }
    
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging && !isResizing) return;
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    if (isDragging) {
      setSelection(prev => ({
        ...prev,
        x: Math.max(0, Math.min(containerRect.width - prev.width, prev.x + deltaX)),
        y: Math.max(0, Math.min(containerRect.height - prev.height, prev.y + deltaY)),
      }));
    } else if (isResizing) {
      setSelection(prev => {
        let newSelection = { ...prev };

        if (isResizing.includes('right')) {
          newSelection.width = Math.max(50, Math.min(containerRect.width - prev.x, prev.width + deltaX));
        }
        if (isResizing.includes('left')) {
          const newWidth = Math.max(50, prev.width - deltaX);
          newSelection.x = Math.max(0, prev.x + prev.width - newWidth);
          newSelection.width = newWidth;
        }
        if (isResizing.includes('bottom')) {
          newSelection.height = Math.max(50, Math.min(containerRect.height - prev.y, prev.height + deltaY));
        }
        if (isResizing.includes('top')) {
          const newHeight = Math.max(50, prev.height - deltaY);
          newSelection.y = Math.max(0, prev.y + prev.height - newHeight);
          newSelection.height = newHeight;
        }

        return newSelection;
      });
    }

    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, isResizing, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(null);
  }, []);

  const handleApplyCrop = async () => {
    if (!imageRef.current || !containerRef.current) return;

    const img = imageRef.current;
    const containerRect = containerRef.current.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();

    // Calculate the scale factor between displayed size and natural size
    const scaleX = img.naturalWidth / imgRect.width;
    const scaleY = img.naturalHeight / imgRect.height;

    // Calculate crop area relative to the image
    const cropX = Math.max(0, (selection.x - (imgRect.left - containerRect.left)) * scaleX);
    const cropY = Math.max(0, (selection.y - (imgRect.top - containerRect.top)) * scaleY);
    const cropWidth = selection.width * scaleX;
    const cropHeight = selection.height * scaleY;

    // Create canvas and apply crop
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = cropWidth;
    canvas.height = cropHeight;

    // Apply rotation if needed
    if (rotation !== 0) {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
    }

    // Draw the cropped image
    ctx.drawImage(
      img,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    // Convert to blob and upload
    canvas.toBlob(async (blob) => {
      if (blob) {
        const url = await uploadFromBlob(blob, `cropped-${Date.now()}.webp`);
        if (url) {
          onCrop(url);
        }
      }
    }, 'image/webp', 0.9);
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Crop Image</DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center gap-4 py-2 border-b">
          <div className="flex items-center gap-2">
            <ZoomOut className="w-4 h-4 text-muted-foreground" />
            <Slider
              value={[zoom * 100]}
              min={50}
              max={200}
              step={10}
              className="w-32"
              onValueChange={([value]) => setZoom(value / 100)}
            />
            <ZoomIn className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground w-12">{Math.round(zoom * 100)}%</span>
          </div>

          <Button variant="outline" size="sm" onClick={handleRotate}>
            <RotateCw className="w-4 h-4 mr-1" />
            Rotate
          </Button>
        </div>

        {/* Crop Area */}
        <div
          ref={containerRef}
          className="relative w-full h-[400px] bg-muted/30 overflow-hidden rounded-lg select-none"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Image */}
          <img
            ref={imageRef}
            src={src}
            alt="Crop preview"
            onLoad={handleImageLoad}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-full max-h-full object-contain"
            style={{
              transform: `translate(-50%, -50%) scale(${zoom}) rotate(${rotation}deg)`,
            }}
          />

          {/* Dark overlay outside selection */}
          {imageLoaded && (
            <>
              <div className="absolute inset-0 bg-black/50 pointer-events-none" />
              
              {/* Clear area (selection) */}
              <div
                className="absolute bg-transparent border-2 border-white shadow-lg cursor-move"
                style={{
                  left: selection.x,
                  top: selection.y,
                  width: selection.width,
                  height: selection.height,
                  boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.5)`,
                }}
                onMouseDown={(e) => handleMouseDown(e, 'move')}
              >
                {/* Grid overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
                  <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
                  <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
                  <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
                </div>

                {/* Resize handles */}
                <div
                  className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white rounded-full cursor-nwse-resize"
                  onMouseDown={(e) => handleMouseDown(e, 'top-left')}
                />
                <div
                  className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white rounded-full cursor-nesw-resize"
                  onMouseDown={(e) => handleMouseDown(e, 'top-right')}
                />
                <div
                  className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white rounded-full cursor-nesw-resize"
                  onMouseDown={(e) => handleMouseDown(e, 'bottom-left')}
                />
                <div
                  className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white rounded-full cursor-nwse-resize"
                  onMouseDown={(e) => handleMouseDown(e, 'bottom-right')}
                />

                {/* Edge handles */}
                <div
                  className="absolute top-1/2 -left-1 w-2 h-6 -translate-y-1/2 bg-white rounded-sm cursor-ew-resize"
                  onMouseDown={(e) => handleMouseDown(e, 'left')}
                />
                <div
                  className="absolute top-1/2 -right-1 w-2 h-6 -translate-y-1/2 bg-white rounded-sm cursor-ew-resize"
                  onMouseDown={(e) => handleMouseDown(e, 'right')}
                />
                <div
                  className="absolute -top-1 left-1/2 w-6 h-2 -translate-x-1/2 bg-white rounded-sm cursor-ns-resize"
                  onMouseDown={(e) => handleMouseDown(e, 'top')}
                />
                <div
                  className="absolute -bottom-1 left-1/2 w-6 h-2 -translate-x-1/2 bg-white rounded-sm cursor-ns-resize"
                  onMouseDown={(e) => handleMouseDown(e, 'bottom')}
                />
              </div>
            </>
          )}

          {/* Loading state */}
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Dimensions info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Original: {imageDimensions.width} × {imageDimensions.height}</span>
          <span>
            Crop: {Math.round(selection.width)} × {Math.round(selection.height)}
          </span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApplyCrop} disabled={uploading || !imageLoaded}>
            {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Apply Crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
