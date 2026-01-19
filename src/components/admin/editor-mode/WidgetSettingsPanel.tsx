import React from 'react';
import { useEditorMode } from '@/contexts/EditorModeContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { WIDGET_LABELS, ANIMATION_OPTIONS, WidgetId } from '@/types/editor.types';
import { X, RotateCcw } from 'lucide-react';

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
    });
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          {WIDGET_LABELS[selectedWidget as WidgetId] || selectedWidget} Settings
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setSelectedWidget(null)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Background */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Background</Label>
        <div className="space-y-2">
          <Select
            value={settings.background_color || 'transparent'}
            onValueChange={(v) => updateWidget(selectedWidget, { background_color: v })}
          >
            <SelectTrigger>
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
      </div>

      {/* Padding */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Spacing</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Padding Top</Label>
            <Select
              value={settings.padding_top || 'py-20'}
              onValueChange={(v) => updateWidget(selectedWidget, { padding_top: v })}
            >
              <SelectTrigger>
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
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Padding Bottom</Label>
            <Select
              value={settings.padding_bottom || 'pb-20'}
              onValueChange={(v) => updateWidget(selectedWidget, { padding_bottom: v })}
            >
              <SelectTrigger>
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
      </div>

      {/* Animation */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Animation</Label>
        <Select
          value={settings.animation || 'fade-up'}
          onValueChange={(v) => updateWidget(selectedWidget, { animation: v as 'none' | 'fade-up' | 'fade-in' | 'slide-left' | 'slide-right' })}
        >
          <SelectTrigger>
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

      {/* Widget-specific settings */}
      {selectedWidget === 'rooms' && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Layout</Label>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Columns</Label>
              <span className="text-sm">{settings.columns || 3}</span>
            </div>
            <Slider
              value={[settings.columns || 3]}
              onValueChange={([v]) => updateWidget(selectedWidget, { columns: v })}
              min={1}
              max={4}
              step={1}
            />
          </div>
        </div>
      )}

      {/* Content Overrides */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Content Overrides (Optional)</Label>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Custom Title</Label>
            <Input
              value={settings.title_override || ''}
              onChange={(e) => updateWidget(selectedWidget, { title_override: e.target.value })}
              placeholder="Leave empty for default"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Custom Subtitle</Label>
            <Input
              value={settings.subtitle_override || ''}
              onChange={(e) => updateWidget(selectedWidget, { subtitle_override: e.target.value })}
              placeholder="Leave empty for default"
            />
          </div>
        </div>
      </div>

      {/* Custom Classes */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Custom CSS Classes</Label>
        <Input
          value={settings.custom_classes || ''}
          onChange={(e) => updateWidget(selectedWidget, { custom_classes: e.target.value })}
          placeholder="e.g., shadow-lg border-t"
          className="font-mono text-xs"
        />
      </div>

      {/* Reset Button */}
      <Button
        variant="outline"
        className="w-full"
        onClick={handleReset}
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        Reset to Default
      </Button>
    </div>
  );
}
