import React from 'react';
import { useEditorMode } from '@/contexts/EditorModeContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { FONT_OPTIONS } from '@/types/editor.types';
import { Palette, Type, Maximize, Layout } from 'lucide-react';

const ColorPicker = ({ 
  label, 
  value, 
  onChange 
}: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void;
}) => {
  // Convert HSL string to hex for the color picker
  const hslToHex = (hsl: string) => {
    try {
      const [h, s, l] = hsl.split(' ').map(v => parseFloat(v.replace('%', '')));
      const sNorm = s / 100;
      const lNorm = l / 100;
      
      const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
      const x = c * (1 - Math.abs((h / 60) % 2 - 1));
      const m = lNorm - c / 2;
      
      let r = 0, g = 0, b = 0;
      if (h < 60) { r = c; g = x; b = 0; }
      else if (h < 120) { r = x; g = c; b = 0; }
      else if (h < 180) { r = 0; g = c; b = x; }
      else if (h < 240) { r = 0; g = x; b = c; }
      else if (h < 300) { r = x; g = 0; b = c; }
      else { r = c; g = 0; b = x; }
      
      const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    } catch {
      return '#000000';
    }
  };

  // Convert hex to HSL string
  const hexToHsl = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return value;
    
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;
    
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={hslToHex(value)}
          onChange={(e) => onChange(hexToHsl(e.target.value))}
          className="w-8 h-8 rounded cursor-pointer border border-border"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-36 text-xs font-mono"
        />
      </div>
    </div>
  );
};

export function ThemeEditor() {
  const { themeConfig, updateTheme } = useEditorMode();

  if (!themeConfig) {
    return <div className="p-4 text-muted-foreground">Loading theme...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <Accordion type="multiple" defaultValue={['colors', 'typography', 'spacing', 'header']} className="w-full">
        {/* Colors Section */}
        <AccordionItem value="colors">
          <AccordionTrigger className="text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Colors
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <ColorPicker
              label="Primary"
              value={themeConfig.color_primary}
              onChange={(v) => updateTheme({ color_primary: v })}
            />
            <ColorPicker
              label="Secondary"
              value={themeConfig.color_secondary}
              onChange={(v) => updateTheme({ color_secondary: v })}
            />
            <ColorPicker
              label="Accent"
              value={themeConfig.color_accent}
              onChange={(v) => updateTheme({ color_accent: v })}
            />
            <ColorPicker
              label="Background"
              value={themeConfig.color_background}
              onChange={(v) => updateTheme({ color_background: v })}
            />
            <ColorPicker
              label="Foreground"
              value={themeConfig.color_foreground}
              onChange={(v) => updateTheme({ color_foreground: v })}
            />
            <ColorPicker
              label="Muted"
              value={themeConfig.color_muted}
              onChange={(v) => updateTheme({ color_muted: v })}
            />
            <ColorPicker
              label="Card"
              value={themeConfig.color_card}
              onChange={(v) => updateTheme({ color_card: v })}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Typography Section */}
        <AccordionItem value="typography">
          <AccordionTrigger className="text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              Typography
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm">Heading Font</Label>
              <Select
                value={themeConfig.font_heading}
                onValueChange={(v) => updateTheme({ font_heading: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <span style={{ fontFamily: font.value }}>{font.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Body Font</Label>
              <Select
                value={themeConfig.font_body}
                onValueChange={(v) => updateTheme({ font_body: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <span style={{ fontFamily: font.value }}>{font.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Base Font Size</Label>
                <span className="text-sm text-muted-foreground">{themeConfig.font_size_base}px</span>
              </div>
              <Slider
                value={[themeConfig.font_size_base]}
                onValueChange={([v]) => updateTheme({ font_size_base: v })}
                min={12}
                max={20}
                step={1}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Spacing Section */}
        <AccordionItem value="spacing">
          <AccordionTrigger className="text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Maximize className="h-4 w-4" />
              Spacing
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm">Section Padding</Label>
              <Select
                value={themeConfig.section_padding}
                onValueChange={(v) => updateTheme({ section_padding: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="py-12">Small (py-12)</SelectItem>
                  <SelectItem value="py-16">Medium (py-16)</SelectItem>
                  <SelectItem value="py-20">Large (py-20)</SelectItem>
                  <SelectItem value="py-24">Extra Large (py-24)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Container Width</Label>
              <Select
                value={themeConfig.container_width}
                onValueChange={(v) => updateTheme({ container_width: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="max-w-5xl">Narrow (max-w-5xl)</SelectItem>
                  <SelectItem value="max-w-6xl">Medium (max-w-6xl)</SelectItem>
                  <SelectItem value="max-w-7xl">Wide (max-w-7xl)</SelectItem>
                  <SelectItem value="max-w-full">Full Width</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Border Radius</Label>
              <Select
                value={themeConfig.border_radius}
                onValueChange={(v) => updateTheme({ border_radius: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">None (0)</SelectItem>
                  <SelectItem value="0.25rem">Small (0.25rem)</SelectItem>
                  <SelectItem value="0.5rem">Medium (0.5rem)</SelectItem>
                  <SelectItem value="0.75rem">Large (0.75rem)</SelectItem>
                  <SelectItem value="1rem">Extra Large (1rem)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Header Section */}
        <AccordionItem value="header">
          <AccordionTrigger className="text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Layout className="h-4 w-4" />
              Header
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm">Header Style</Label>
              <Select
                value={themeConfig.header_style}
                onValueChange={(v) => updateTheme({ header_style: v as 'transparent' | 'solid' | 'gradient' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transparent">Transparent</SelectItem>
                  <SelectItem value="solid">Solid</SelectItem>
                  <SelectItem value="gradient">Gradient</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Sticky Header</Label>
              <Switch
                checked={themeConfig.header_sticky}
                onCheckedChange={(v) => updateTheme({ header_sticky: v })}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}












