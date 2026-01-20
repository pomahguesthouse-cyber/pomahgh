import React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ColorPickerFieldProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  presets?: string[];
}

const DEFAULT_PRESETS = [
  'transparent',
  '#ffffff',
  '#f8f9fa',
  '#e9ecef',
  '#000000',
  '#1a1a1a',
  '#f59e0b',
  '#fbbf24',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ef4444',
];

export function ColorPickerField({ 
  label, 
  value, 
  onChange, 
  presets = DEFAULT_PRESETS 
}: ColorPickerFieldProps) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((color) => (
          <button
            key={color}
            type="button"
            className={cn(
              "w-6 h-6 rounded border border-border transition-all hover:scale-110",
              value === color && "ring-2 ring-primary ring-offset-1"
            )}
            style={{
              backgroundColor: color === 'transparent' ? 'transparent' : color,
              backgroundImage: color === 'transparent'
                ? 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)'
                : 'none',
              backgroundSize: color === 'transparent' ? '8px 8px' : 'auto',
              backgroundPosition: color === 'transparent' ? '0 0, 4px 4px' : 'auto',
            }}
            onClick={() => onChange(color)}
            title={color}
          />
        ))}
        <div className="relative">
          <input
            type="color"
            value={value?.startsWith('#') ? value : '#ffffff'}
            onChange={(e) => onChange(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer border border-border"
            title="Custom color"
          />
        </div>
      </div>
      {value && value !== 'transparent' && (
        <p className="text-xs text-muted-foreground font-mono">{value}</p>
      )}
    </div>
  );
}
