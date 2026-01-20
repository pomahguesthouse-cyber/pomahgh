import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditorMode } from '@/contexts/EditorModeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Type,
  Eye,
  EyeOff,
  Trash2,
  Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const FONT_FAMILIES = [
  { value: 'inherit', label: 'Default' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Cinzel', label: 'Cinzel' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Oswald', label: 'Oswald' },
  { value: 'Raleway', label: 'Raleway' },
  { value: 'Merriweather', label: 'Merriweather' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Arial', label: 'Arial' },
];

const FONT_SIZES = [
  { value: '10px', label: '10' },
  { value: '12px', label: '12' },
  { value: '14px', label: '14' },
  { value: '16px', label: '16' },
  { value: '18px', label: '18' },
  { value: '20px', label: '20' },
  { value: '24px', label: '24' },
  { value: '28px', label: '28' },
  { value: '32px', label: '32' },
  { value: '36px', label: '36' },
  { value: '40px', label: '40' },
  { value: '48px', label: '48' },
  { value: '56px', label: '56' },
  { value: '64px', label: '64' },
  { value: '72px', label: '72' },
];

const FONT_WEIGHTS = [
  { value: 'normal', label: 'Normal' },
  { value: '300', label: 'Light' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semibold' },
  { value: 'bold', label: 'Bold' },
  { value: '800', label: 'Extra Bold' },
];

const PRESET_COLORS = [
  '#ffffff', '#000000', '#6b7280', '#ef4444', '#f97316', 
  '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6',
  '#ec4899', '#f43f5e',
];

interface FloatingPropertyEditorProps {
  position?: { top: number; left: number };
}

export function FloatingPropertyEditor({ position: fixedPosition }: FloatingPropertyEditorProps) {
  const { 
    selectedElement, 
    elementOverrides = {},
    updateElementOverride,
    setSelectedElement,
  } = useEditorMode();
  
  const [position, setPosition] = React.useState({ top: 100, left: 0 });

  // Check if selected element is an image
  const element = selectedElement
    ? document.querySelector(`[data-element-id="${selectedElement}"]`)
    : null;
  const elementType = element?.getAttribute('data-element-type');
  
  // Update position when selected element changes
  React.useEffect(() => {
    if (selectedElement && elementType !== 'image') {
      const el = document.querySelector(`[data-element-id="${selectedElement}"]`);
      if (el) {
        const rect = el.getBoundingClientRect();
        const toolbarWidth = 500; // Approximate toolbar width
        
        // Position toolbar above element, centered
        let left = rect.left + rect.width / 2 - toolbarWidth / 2;
        let top = rect.top - 50;
        
        // Keep within viewport bounds
        if (left < 10) left = 10;
        if (left + toolbarWidth > window.innerWidth - 10) {
          left = window.innerWidth - toolbarWidth - 10;
        }
        if (top < 60) top = rect.bottom + 10; // Show below if no space above
        
        setPosition({ top, left });
      }
    }
  }, [selectedElement, elementType]);

  // Don't show this toolbar for images - ImagePropertyEditor handles that
  if (!selectedElement || elementType === 'image') return null;

  const currentOverrides = elementOverrides[selectedElement] || {};

  const handleChange = (property: string, value: string | boolean) => {
    updateElementOverride?.(selectedElement, { [property]: value });
  };

  const handleToggleVisibility = () => {
    handleChange('hidden', !currentOverrides.hidden);
  };

  const handleDelete = () => {
    handleChange('deleted', true);
    setSelectedElement(null);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.96 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="fixed z-[200] bg-background border border-border rounded-lg shadow-xl p-2"
        style={{
          top: fixedPosition?.top ?? position.top,
          left: fixedPosition?.left ?? position.left,
        }}
      >
        <div className="flex items-center gap-1">
          {/* Font Family */}
          <Select
            value={currentOverrides.fontFamily || 'inherit'}
            onValueChange={(value) => handleChange('fontFamily', value)}
          >
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <Type className="w-3 h-3 mr-1" />
              <SelectValue placeholder="Font" />
            </SelectTrigger>
            <SelectContent>
              {FONT_FAMILIES.map((font) => (
                <SelectItem key={font.value} value={font.value} className="text-xs">
                  {font.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Font Size */}
          <Select
            value={currentOverrides.fontSize || '16px'}
            onValueChange={(value) => handleChange('fontSize', value)}
          >
            <SelectTrigger className="w-[70px] h-8 text-xs">
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent>
              {FONT_SIZES.map((size) => (
                <SelectItem key={size.value} value={size.value} className="text-xs">
                  {size.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Text Formatting */}
          <Button
            variant={currentOverrides.fontWeight === 'bold' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => handleChange('fontWeight', currentOverrides.fontWeight === 'bold' ? 'normal' : 'bold')}
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={currentOverrides.fontStyle === 'italic' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => handleChange('fontStyle', currentOverrides.fontStyle === 'italic' ? 'normal' : 'italic')}
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={currentOverrides.textDecoration === 'underline' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => handleChange('textDecoration', currentOverrides.textDecoration === 'underline' ? 'none' : 'underline')}
          >
            <Underline className="h-3.5 w-3.5" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Text Alignment */}
          <Button
            variant={currentOverrides.textAlign === 'left' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => handleChange('textAlign', 'left')}
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={currentOverrides.textAlign === 'center' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => handleChange('textAlign', 'center')}
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={currentOverrides.textAlign === 'right' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => handleChange('textAlign', 'right')}
          >
            <AlignRight className="h-3.5 w-3.5" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Color Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <div 
                  className="w-4 h-4 rounded border border-border"
                  style={{ backgroundColor: currentOverrides.color || '#000000' }}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
              <div className="space-y-2">
                <Label className="text-xs">Text Color</Label>
                <div className="grid grid-cols-6 gap-1.5">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      className={cn(
                        'w-6 h-6 rounded border transition-transform hover:scale-110',
                        currentOverrides.color === color && 'ring-2 ring-primary ring-offset-1'
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => handleChange('color', color)}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    type="color"
                    value={currentOverrides.color || '#000000'}
                    onChange={(e) => handleChange('color', e.target.value)}
                    className="w-8 h-8 p-0 border-0"
                  />
                  <Input
                    value={currentOverrides.color || '#000000'}
                    onChange={(e) => handleChange('color', e.target.value)}
                    className="h-8 text-xs font-mono"
                    placeholder="#000000"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Actions */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleToggleVisibility}
            title={currentOverrides.hidden ? 'Show' : 'Hide'}
          >
            {currentOverrides.hidden ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
