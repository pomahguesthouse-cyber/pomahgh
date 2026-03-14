import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const BRAND_PRESETS = [
  "#0f172a", "#1e293b", "#334155", "#475569", "#64748b",
  "#ffffff", "#f8fafc", "#f1f5f9", "#e2e8f0",
  "#1e40af", "#2563eb", "#3b82f6",
  "#dc2626", "#ef4444",
  "#16a34a", "#22c55e",
  "#eab308", "#f59e0b",
  "#7c3aed", "#a855f7",
];

const RECENT_COLORS_KEY = "editor-recent-colors";

function getRecentColors(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_COLORS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addRecentColor(color: string) {
  const recent = getRecentColors().filter(c => c !== color);
  recent.unshift(color);
  localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(recent.slice(0, 8)));
}

interface ColorPickerFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function ColorPickerField({ label, value, onChange }: ColorPickerFieldProps) {
  const [hexInput, setHexInput] = useState(value || "#000000");
  const [recentColors, setRecentColors] = useState<string[]>(getRecentColors());

  useEffect(() => {
    setHexInput(value || "#000000");
  }, [value]);

  const handleColorChange = (color: string) => {
    setHexInput(color);
    onChange(color);
    addRecentColor(color);
    setRecentColors(getRecentColors());
  };

  const handleHexSubmit = () => {
    if (/^#[0-9A-Fa-f]{3,8}$/.test(hexInput)) {
      handleColorChange(hexInput);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start gap-2 h-9"
          >
            <div
              className="h-5 w-5 rounded border border-border shrink-0"
              style={{ backgroundColor: value || "#000000" }}
            />
            <span className="text-xs font-mono">{value || "#000000"}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          {/* Native color input */}
          <div className="mb-3">
            <Input
              type="color"
              value={value || "#000000"}
              onChange={(e) => handleColorChange(e.target.value)}
              className="h-8 w-full p-0.5 cursor-pointer"
            />
          </div>

          {/* Hex input */}
          <div className="flex gap-2 mb-3">
            <Input
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              onBlur={handleHexSubmit}
              onKeyDown={(e) => e.key === "Enter" && handleHexSubmit()}
              className="h-7 text-xs font-mono flex-1"
              placeholder="#000000"
            />
          </div>

          {/* Preset colors */}
          <div className="mb-2">
            <p className="text-[10px] text-muted-foreground mb-1.5">Presets</p>
            <div className="flex flex-wrap gap-1">
              {BRAND_PRESETS.map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorChange(color)}
                  className={cn(
                    "h-6 w-6 rounded border border-border hover:scale-110 transition-transform",
                    value === color && "ring-2 ring-primary ring-offset-1"
                  )}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Recent colors */}
          {recentColors.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1.5">Recent</p>
              <div className="flex flex-wrap gap-1">
                {recentColors.map((color, i) => (
                  <button
                    key={`${color}-${i}`}
                    onClick={() => handleColorChange(color)}
                    className={cn(
                      "h-6 w-6 rounded border border-border hover:scale-110 transition-transform",
                      value === color && "ring-2 ring-primary ring-offset-1"
                    )}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
