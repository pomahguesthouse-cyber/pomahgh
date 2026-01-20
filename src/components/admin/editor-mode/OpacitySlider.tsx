import React from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface OpacitySliderProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
}

export function OpacitySlider({ 
  value, 
  onChange, 
  label = "Opacity" 
}: OpacitySliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <span className="text-xs text-muted-foreground font-medium">{value}%</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={0}
        max={100}
        step={5}
        className="w-full"
      />
    </div>
  );
}












