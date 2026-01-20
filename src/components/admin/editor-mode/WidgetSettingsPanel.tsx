import React from 'react';
import { useEditorMode } from '@/contexts/EditorModeContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { WIDGET_LABELS, ANIMATION_OPTIONS, WidgetId } from '@/types/editor.types';
import { X, RotateCcw } from 'lucide-react';
import { ColorPickerField } from './ColorPickerField';
import { OpacitySlider } from './OpacitySlider';

export function WidgetSettingsPanel() {
  const { selectedWidget, setSelectedWidget, widgetConfigs, updateWidget } = useEditorMode();

  if (!selectedWidget) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p className="text-sm">Select a widget to edit its settings</p>
      </div>
    );
  }

  const widget = widgetConfigs.find(w => w.widget_id === selectedWidget);
  if (!widget) return null;

  const settings = widget.settings;

  const handleReset = () => {
    updateWidget(selectedWidget, {
      background_color: undefined,
      padding_top: undefined,
      padding_bottom: undefined,
      animation: 'fade-up',
      custom_classes: undefined,
      title_override: undefined,
      subtitle_override: undefined,
      header_bg_color: undefined,
      header_bg_opacity: undefined,
      content_bg_color: undefined,
      content_bg_opacity: undefined,
      line_color: undefined,
      line_height: undefined,
      line_width: undefined,
      button_bg_color: undefined,
      button_text_color: undefined,
      button_hover_color: undefined,
    });
  };

  // Widgets that have buttons
  const widgetsWithButtons = ['hero', 'rooms', 'contact'];
  const hasButtons = widgetsWithButtons.includes(selectedWidget);

  // Widgets that have header/line styling
  const widgetsWithHeader = ['rooms', 'amenities', 'welcome', 'location', 'contact', 'google_rating'];
  const hasHeaderStyling = widgetsWithHeader.includes(selectedWidget);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">
          {WIDGET_LABELS[selectedWidget as WidgetId] || selectedWidget} Settings
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setSelectedWidget(null)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Accordion type="multiple" defaultValue={['general', 'header-style', 'content-style']} className="w-full">
        {/* General Settings */}
        <AccordionItem value="general">
          <AccordionTrigger className="text-sm py-2">General</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            {/* Background */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Section Background</Label>
              <Select
                value={settings.background_color || 'transparent'}
                onValueChange={(v) => updateWidget(selectedWidget, { background_color: v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select background" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transparent">Transparent</SelectItem>
                  <SelectItem value="bg-background">Background</SelectItem>
                  <SelectItem value="bg-muted">Muted</SelectItem>
                  <SelectItem value="bg-card">Card</SelectItem>
                  <SelectItem value="bg-primary/5">Primary Light</SelectItem>
                  <SelectItem value="bg-secondary">Secondary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Padding */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Padding Top</Label>
                <Select
                  value={settings.padding_top || 'py-20'}
                  onValueChange={(v) => updateWidget(selectedWidget, { padding_top: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt-8">8 (2rem)</SelectItem>
                    <SelectItem value="pt-12">12 (3rem)</SelectItem>
                    <SelectItem value="pt-16">16 (4rem)</SelectItem>
                    <SelectItem value="pt-20">20 (5rem)</SelectItem>
                    <SelectItem value="pt-24">24 (6rem)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Padding Bottom</Label>
                <Select
                  value={settings.padding_bottom || 'pb-20'}
                  onValueChange={(v) => updateWidget(selectedWidget, { padding_bottom: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pb-8">8 (2rem)</SelectItem>
                    <SelectItem value="pb-12">12 (3rem)</SelectItem>
                    <SelectItem value="pb-16">16 (4rem)</SelectItem>
                    <SelectItem value="pb-20">20 (5rem)</SelectItem>
                    <SelectItem value="pb-24">24 (6rem)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Animation */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Animation</Label>
              <Select
                value={settings.animation || 'fade-up'}
                onValueChange={(v) => updateWidget(selectedWidget, { animation: v as any })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANIMATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rooms-specific: Columns */}
            {selectedWidget === 'rooms' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Columns</Label>
                  <span className="text-xs font-medium">{settings.columns || 3}</span>
                </div>
                <Slider
                  value={[settings.columns || 3]}
                  onValueChange={([v]) => updateWidget(selectedWidget, { columns: v })}
                  min={1}
                  max={4}
                  step={1}
                />
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Header/Title Area Styling */}
        {hasHeaderStyling && (
          <AccordionItem value="header-style">
            <AccordionTrigger className="text-sm py-2">Header Styling</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <ColorPickerField
                label="Header Background"
                value={settings.header_bg_color || 'transparent'}
                onChange={(v) => updateWidget(selectedWidget, { header_bg_color: v })}
              />
              
              <OpacitySlider
                value={settings.header_bg_opacity ?? 100}
                onChange={(v) => updateWidget(selectedWidget, { header_bg_opacity: v })}
                label="Background Opacity"
              />
              
              <Separator />
              
              <ColorPickerField
                label="Line/Divider Color"
                value={settings.line_color || ''}
                onChange={(v) => updateWidget(selectedWidget, { line_color: v })}
              />
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Line Height (px)</Label>
                  <span className="text-xs font-medium">{settings.line_height || 4}px</span>
                </div>
                <Slider
                  value={[settings.line_height || 4]}
                  onValueChange={([v]) => updateWidget(selectedWidget, { line_height: v })}
                  min={0}
                  max={8}
                  step={1}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Line Width (px)</Label>
                  <span className="text-xs font-medium">{settings.line_width || 96}px</span>
                </div>
                <Slider
                  value={[settings.line_width || 96]}
                  onValueChange={([v]) => updateWidget(selectedWidget, { line_width: v })}
                  min={16}
                  max={192}
                  step={8}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Content Area Styling */}
        <AccordionItem value="content-style">
          <AccordionTrigger className="text-sm py-2">Content Styling</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <ColorPickerField
              label="Content Background"
              value={settings.content_bg_color || 'transparent'}
              onChange={(v) => updateWidget(selectedWidget, { content_bg_color: v })}
            />
            
            <OpacitySlider
              value={settings.content_bg_opacity ?? 100}
              onChange={(v) => updateWidget(selectedWidget, { content_bg_opacity: v })}
              label="Content Opacity"
            />
          </AccordionContent>
        </AccordionItem>

        {/* Button Styling */}
        {hasButtons && (
          <AccordionItem value="button-style">
            <AccordionTrigger className="text-sm py-2">Button Styling</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <ColorPickerField
                label="Button Background"
                value={settings.button_bg_color || '#f59e0b'}
                onChange={(v) => updateWidget(selectedWidget, { button_bg_color: v })}
              />
              
              <ColorPickerField
                label="Button Text Color"
                value={settings.button_text_color || '#000000'}
                onChange={(v) => updateWidget(selectedWidget, { button_text_color: v })}
              />
              
              <ColorPickerField
                label="Button Hover Color"
                value={settings.button_hover_color || '#fbbf24'}
                onChange={(v) => updateWidget(selectedWidget, { button_hover_color: v })}
              />
              
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Border Radius</Label>
                <Select
                  value={settings.button_border_radius || 'default'}
                  onValueChange={(v) => updateWidget(selectedWidget, { button_border_radius: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="0">None (0)</SelectItem>
                    <SelectItem value="4px">Small (4px)</SelectItem>
                    <SelectItem value="8px">Medium (8px)</SelectItem>
                    <SelectItem value="12px">Large (12px)</SelectItem>
                    <SelectItem value="9999px">Full (Pill)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Text Overrides */}
        <AccordionItem value="text-overrides">
          <AccordionTrigger className="text-sm py-2">Text Overrides</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Custom Title</Label>
              <Input
                value={settings.title_override || ''}
                onChange={(e) => updateWidget(selectedWidget, { title_override: e.target.value })}
                placeholder="Leave empty for default"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Custom Subtitle</Label>
              <Input
                value={settings.subtitle_override || ''}
                onChange={(e) => updateWidget(selectedWidget, { subtitle_override: e.target.value })}
                placeholder="Leave empty for default"
                className="h-8 text-xs"
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Custom CSS */}
        <AccordionItem value="advanced">
          <AccordionTrigger className="text-sm py-2">Advanced</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Custom CSS Classes</Label>
              <Input
                value={settings.custom_classes || ''}
                onChange={(e) => updateWidget(selectedWidget, { custom_classes: e.target.value })}
                placeholder="e.g., shadow-lg border-t"
                className="h-8 text-xs font-mono"
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Reset Button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleReset}
      >
        <RotateCcw className="h-3 w-3 mr-2" />
        Reset to Default
      </Button>
    </div>
  );
}












