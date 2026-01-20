import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditorMode } from '@/contexts/EditorModeContext';
import { useEditorImageUpload } from '@/hooks/shared/useEditorImageUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Upload,
  Link,
  Crop,
  Eye,
  EyeOff,
  RotateCcw,
  Maximize2,
  Square,
  RectangleHorizontal,
  Smartphone,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageCropModal } from './ImageCropModal';

const OBJECT_FIT_OPTIONS = [
  { value: 'cover', label: 'Cover', icon: Maximize2 },
  { value: 'contain', label: 'Contain', icon: Square },
  { value: 'fill', label: 'Fill', icon: RectangleHorizontal },
  { value: 'none', label: 'None', icon: Smartphone },
];

const ASPECT_RATIOS = [
  { value: 'auto', label: 'Free' },
  { value: '1/1', label: '1:1' },
  { value: '4/3', label: '4:3' },
  { value: '16/9', label: '16:9' },
  { value: '3/2', label: '3:2' },
  { value: '2/3', label: '2:3' },
  { value: '9/16', label: '9:16' },
];

export function ImagePropertyEditor() {
  const {
    selectedElement,
    elementOverrides = {},
    updateElementOverride,
    setSelectedElement,
  } = useEditorMode();

  const { uploadImage, uploading } = useEditorImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [position, setPosition] = useState({ top: 100, left: 0 });
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [showCropModal, setShowCropModal] = useState(false);

  // Check if selected element is an image
  const element = selectedElement
    ? document.querySelector(`[data-element-id="${selectedElement}"]`)
    : null;
  const isImageElement = element?.getAttribute('data-element-type') === 'image';

  // Update position when selected element changes
  useEffect(() => {
    if (selectedElement && isImageElement) {
      const el = document.querySelector(`[data-element-id="${selectedElement}"]`);
      if (el) {
        const rect = el.getBoundingClientRect();
        const toolbarWidth = 400;

        let left = rect.left + rect.width / 2 - toolbarWidth / 2;
        let top = rect.top - 60;

        if (left < 10) left = 10;
        if (left + toolbarWidth > window.innerWidth - 10) {
          left = window.innerWidth - toolbarWidth - 10;
        }
        if (top < 70) top = rect.bottom + 10;

        setPosition({ top, left });
      }
    }
  }, [selectedElement, isImageElement]);

  if (!selectedElement || !isImageElement) return null;

  const overrides = elementOverrides[selectedElement] || {};

  const handleChange = (property: string, value: string | boolean | number) => {
    updateElementOverride?.(selectedElement, { [property]: value });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadImage(file);
    if (url) {
      handleChange('imageUrl', url);
    }
  };

  const handleUrlSubmit = () => {
    if (urlValue.trim()) {
      handleChange('imageUrl', urlValue.trim());
      setShowUrlInput(false);
      setUrlValue('');
    }
  };

  const handleToggleVisibility = () => {
    handleChange('hidden', !overrides.hidden);
  };

  const handleReset = () => {
    updateElementOverride?.(selectedElement, {
      imageUrl: undefined,
      imageWidth: undefined,
      imageHeight: undefined,
      objectFit: undefined,
      objectPosition: undefined,
      borderRadius: undefined,
      aspectRatio: undefined,
      hidden: false,
    });
  };

  const handleCropComplete = (croppedUrl: string) => {
    handleChange('imageUrl', croppedUrl);
    setShowCropModal(false);
  };

  const currentImageUrl = overrides.imageUrl || element?.getAttribute('src') || '';

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.96 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="fixed z-[200] bg-background border border-border rounded-lg shadow-xl p-3"
          style={{
            top: position.top,
            left: position.left,
            maxWidth: '400px',
          }}
        >
          <div className="flex flex-col gap-3">
            {/* Upload Row */}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-1" />
                )}
                Upload
              </Button>

              <Popover open={showUrlInput} onOpenChange={setShowUrlInput}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <Link className="w-4 h-4 mr-1" />
                    URL
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3" align="start">
                  <div className="space-y-2">
                    <Label className="text-xs">Image URL</Label>
                    <div className="flex gap-2">
                      <Input
                        value={urlValue}
                        onChange={(e) => setUrlValue(e.target.value)}
                        placeholder="https://..."
                        className="h-8 text-xs"
                        onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                      />
                      <Button size="sm" className="h-8" onClick={handleUrlSubmit}>
                        Apply
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => setShowCropModal(true)}
                disabled={!currentImageUrl}
              >
                <Crop className="w-4 h-4 mr-1" />
                Crop
              </Button>

              <div className="w-px h-6 bg-border" />

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleToggleVisibility}
                title={overrides.hidden ? 'Show' : 'Hide'}
              >
                {overrides.hidden ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleReset}
                title="Reset"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            {/* Size & Fit Row */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Label className="text-xs text-muted-foreground">W:</Label>
                <Input
                  value={overrides.imageWidth || 'auto'}
                  onChange={(e) => handleChange('imageWidth', e.target.value)}
                  className="h-7 w-16 text-xs"
                  placeholder="auto"
                />
              </div>

              <div className="flex items-center gap-1">
                <Label className="text-xs text-muted-foreground">H:</Label>
                <Input
                  value={overrides.imageHeight || 'auto'}
                  onChange={(e) => handleChange('imageHeight', e.target.value)}
                  className="h-7 w-16 text-xs"
                  placeholder="auto"
                />
              </div>

              <div className="w-px h-6 bg-border" />

              <Select
                value={overrides.objectFit || 'cover'}
                onValueChange={(value) => handleChange('objectFit', value)}
              >
                <SelectTrigger className="w-[90px] h-7 text-xs">
                  <SelectValue placeholder="Fit" />
                </SelectTrigger>
                <SelectContent>
                  {OBJECT_FIT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-xs">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Aspect Ratio Row */}
            <div className="flex items-center gap-1">
              <Label className="text-xs text-muted-foreground mr-1">Ratio:</Label>
              {ASPECT_RATIOS.map((ratio) => (
                <Button
                  key={ratio.value}
                  variant={overrides.aspectRatio === ratio.value ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => handleChange('aspectRatio', ratio.value)}
                >
                  {ratio.label}
                </Button>
              ))}
            </div>

            {/* Border Radius Row */}
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">
                Radius:
              </Label>
              <Slider
                value={[parseInt(overrides.borderRadius || '0')]}
                max={50}
                step={1}
                className="flex-1"
                onValueChange={([value]) => handleChange('borderRadius', `${value}px`)}
              />
              <span className="text-xs text-muted-foreground w-10 text-right">
                {overrides.borderRadius || '0px'}
              </span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Crop Modal */}
      {showCropModal && currentImageUrl && (
        <ImageCropModal
          src={currentImageUrl}
          onCrop={handleCropComplete}
          onClose={() => setShowCropModal(false)}
        />
      )}
    </>
  );
}












